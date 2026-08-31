import { searchDocuments } from "../clients/indianKanoonClient.js";
import { getMockSearchResponse } from "../fixtures/kanoonSearch.js";
import { callModelJSON } from "../clients/llmClient.js";
import { config } from "../config.js";
import * as logger from "../lib/logger.js";

const MAX_CANDIDATES = 10;

// If this large a fraction of results share the exact same publish date,
// treat it as a likely bulk/batch scrape rather than genuine relevance
// clustering (seen in practice: 10/10 near-identical results, same date).
const BULK_GROUP_MIN_SIZE = 4;
const BULK_GROUP_MIN_RATIO = 0.5;

// A candidate scoring at or above this is kept outright.
const RELEVANCE_THRESHOLD = 6;
// If fewer than this many candidates clear the threshold, keep the top-scoring
// ones anyway instead of falling back to the full unfiltered list.
const MIN_KEPT_CANDIDATES = 3;
const FLOOR_KEEP_COUNT = 5;

// Low temperature for the scoring call: this is a judgment task where we want
// consistent scores between runs on the same input, not creative variation.
const SCORING_TEMPERATURE = 0.1;

const RELEVANCE_SYSTEM_PROMPT = `
You are scoring case-law search results for topical relevance. Indian
Kanoon's search is keyword-based, not semantic, so results often share only
generic legal terms (e.g. "injunction", "damages", "compensation") with the
user's situation while concerning a completely different area of law or
fact pattern.

You will be given the user's case category, a summary of their key facts,
and a list of candidate judgments (tid, title, snippet).

Score EVERY candidate given (do not omit any) from 0 to 10 on topical
relevance to the user's actual fact pattern:
- 9-10: directly on-point — same fact pattern and legal issue
- 6-8: clearly related — same area of law, closely analogous facts
- 3-5: tangentially related — shares legal concepts/sections but the core
  facts differ, or the match is borderline
- 0-2: unrelated — matched only on generic/boilerplate keywords, concerns a
  different area of law entirely, or looks like part of a bulk/batch of
  near-identical results rather than a genuinely on-point judgment

Respond with ONLY a JSON object of this shape:
{ "scores": [{ "tid": number, "score": number }, ...] }
`.trim();

/**
 * Picks the Indian Kanoon doctypes filter based on case category.
 *
 * "scorders" (Supreme Court orders, as opposed to full reported judgments) is
 * included for criminal matters because criminal SLPs/bail/quashing petitions
 * are very often disposed of by short orders rather than full judgments — a
 * civil/property/matrimonial-property search is more likely to actually find
 * full reasoned judgments, so we skip scorders there to avoid diluting
 * results with terse, low-detail orders that summarize poorly in Module 4.
 */
function pickDoctypes(category = "") {
  const isCriminal = /criminal|ipc|crpc|dowry|assault|murder|theft|cheating|breach of trust|dacoity|rape|kidnap/i.test(
    category
  );
  return isCriminal ? "supremecourt,scorders,highcourts" : "supremecourt,highcourts";
}

/** Strips the literal <b>...</b> highlight tags Indian Kanoon puts in `headline`. */
function stripHighlightTags(html = "") {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Maps a raw Indian Kanoon search doc into our candidate shape. */
function toCandidate(doc) {
  return {
    tid: doc.tid,
    title: stripHighlightTags(doc.title), // titles can carry the same <b> highlight tags as headline
    court: doc.docsource, // confirmed reliable court/source field; `doctype` is an undocumented numeric code, not used
    date: doc.publishdate ?? null,
    snippet: stripHighlightTags(doc.headline),
    numCites: doc.numcites ?? 0,
    numCitedBy: doc.numcitedby ?? 0,
    // present inconsistently across documents — default to null rather than assuming presence
    citation: doc.citation ?? null,
    author: doc.author ?? null,
  };
}

function normalizeTitle(title = "") {
  return title.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Catches near-duplicate entries that Indian Kanoon indexes under different
 * tids (e.g. an order + judgment pair, or a re-published entry) but which
 * share the same title and publish date — this is a real, observed case
 * (same "Selvan vs C.Thangaraj" judgment appearing under two different tids).
 * Keeps whichever has more complete metadata (author/citation present),
 * otherwise the first one encountered.
 */
function dedupeByTitleAndDate(candidates) {
  const byKey = new Map();

  for (const c of candidates) {
    const key = `${normalizeTitle(c.title)}|${c.date ?? ""}`;
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, c);
      continue;
    }

    const existingCompleteness = (existing.author ? 1 : 0) + (existing.citation ? 1 : 0);
    const candidateCompleteness = (c.author ? 1 : 0) + (c.citation ? 1 : 0);
    if (candidateCompleteness > existingCompleteness) {
      byKey.set(key, c);
    }
  }

  return Array.from(byKey.values());
}

/**
 * Drops all but the single most-cited result from any date group that makes
 * up an unusually large share of the candidate pool — a signal of a bulk/
 * batch keyword match (e.g. 10 near-identical results from one date) rather
 * than genuinely distinct relevant judgments.
 */
function filterBulkDateBatches(candidates) {
  const byDate = new Map();
  for (const c of candidates) {
    if (!c.date) continue;
    if (!byDate.has(c.date)) byDate.set(c.date, []);
    byDate.get(c.date).push(c);
  }

  const bulkDates = new Set();
  for (const [date, group] of byDate) {
    if (group.length >= BULK_GROUP_MIN_SIZE && group.length / candidates.length > BULK_GROUP_MIN_RATIO) {
      bulkDates.add(date);
    }
  }

  if (bulkDates.size === 0) return candidates;

  logger.warn(
    `  Detected likely bulk/batch match on date(s) [${[...bulkDates].join(", ")}] — keeping only the most-cited result per date.`
  );

  const kept = [];
  const bestPerBulkDate = new Map();

  for (const c of candidates) {
    if (!bulkDates.has(c.date)) {
      kept.push(c);
      continue;
    }
    const current = bestPerBulkDate.get(c.date);
    if (!current || c.numCitedBy > current.numCitedBy) {
      bestPerBulkDate.set(c.date, c);
    }
  }

  return [...kept, ...bestPerBulkDate.values()];
}

/** Asks the LLM to score every candidate 0-10; attaches the score to each. */
async function scoreRelevance(candidates, { category, keyFacts }) {
  const prompt = JSON.stringify({
    category,
    keyFacts,
    candidates: candidates.map((c) => ({ tid: c.tid, title: c.title, snippet: c.snippet })),
  });

  const result = await callModelJSON(prompt, RELEVANCE_SYSTEM_PROMPT, "extraction", {
    temperature: SCORING_TEMPERATURE,
  });
  const scoreByTid = new Map((result.scores ?? []).map((s) => [s.tid, s.score]));

  return candidates.map((c) => ({
    ...c,
    relevanceScore: scoreByTid.has(c.tid) ? scoreByTid.get(c.tid) : 0,
  }));
}

/**
 * LLM-based topical relevance scoring: reviews the user's case facts against
 * each candidate's title/snippet and scores it 0-10, rather than a binary
 * keep/reject. Candidates scoring >= RELEVANCE_THRESHOLD are kept outright;
 * if too few clear that bar, the top-scoring FLOOR_KEEP_COUNT are kept anyway
 * (graceful degradation for genuinely thin case law, e.g. low-value disputes
 * rarely reported at SC/HC level) instead of an all-or-nothing binary filter.
 *
 * The full-unfiltered-list fallback is reserved for when the LLM call itself
 * fails (bad JSON, API error) — not for "nothing scored well", since the
 * floor already handles that case gracefully.
 */
async function filterByRelevance(candidates, { category, keyFacts }) {
  if (candidates.length === 0) return candidates;

  let scored;
  try {
    scored = await scoreRelevance(candidates, { category, keyFacts });
  } catch (err) {
    logger.warn(
      `  Relevance scoring failed (${err.message}); falling back to unfiltered candidates (last resort).`
    );
    // Guarantee relevanceScore is always present downstream, even when scoring
    // itself couldn't run — null signals "not scored", distinct from a real 0.
    return candidates.map((c) => ({ ...c, relevanceScore: null }));
  }

  const sorted = [...scored].sort((a, b) => b.relevanceScore - a.relevanceScore);
  const aboveThreshold = sorted.filter((c) => c.relevanceScore >= RELEVANCE_THRESHOLD);
  const usedFloor = aboveThreshold.length < MIN_KEPT_CANDIDATES;
  const kept = usedFloor ? sorted.slice(0, FLOOR_KEEP_COUNT) : aboveThreshold;
  const keptTids = new Set(kept.map((c) => c.tid));

  if (usedFloor) {
    logger.info(
      `  Only ${aboveThreshold.length} candidate(s) scored >= ${RELEVANCE_THRESHOLD}; keeping top ${kept.length} by score instead of the full unfiltered list.`
    );
  }

  for (const c of sorted) {
    const mark = keptTids.has(c.tid) ? "keep" : "drop";
    logger.info(`    [${mark}] score ${c.relevanceScore}/10 — ${c.title}`);
  }

  return kept;
}

/**
 * Module 2: Case Search Tool
 * Input: enhanced query object from Module 1 (uses .searchQueries, .category, .keyFacts)
 * Output: deduplicated, bulk-filtered, relevance-scored array of candidate
 *         cases (each carrying a `relevanceScore` 0-10, or null if scoring
 *         failed), limited to MAX_CANDIDATES. Low-scoring candidates are NOT
 *         filtered out beyond the floor logic in filterByRelevance — the
 *         score itself is the signal for downstream consumers to weigh
 *         confidence, not a hard cutoff.
 */
export async function searchCases({ searchQueries, category, keyFacts }) {
  const doctypes = pickDoctypes(category);
  const seen = new Map();

  for (const query of searchQueries) {
    // The doctypes filter must be embedded inside formInput itself — Indian
    // Kanoon ignores it as a separate query parameter (verified via live testing).
    const formInput = `${query} doctypes:${doctypes}`;
    logger.info(`  search: "${formInput}"`);

    const response = await searchDocuments({
      formInput,
      pagenum: 0,
      mockResponse: config.indianKanoonMock ? getMockSearchResponse(formInput) : undefined,
    });

    for (const doc of response.docs ?? []) {
      if (!seen.has(doc.tid)) {
        seen.set(doc.tid, toCandidate(doc));
      }
    }
  }

  const merged = Array.from(seen.values());
  const deduped = dedupeByTitleAndDate(merged);
  const deBulked = filterBulkDateBatches(deduped);
  const relevant = await filterByRelevance(deBulked, { category, keyFacts });

  return relevant.slice(0, MAX_CANDIDATES);
}

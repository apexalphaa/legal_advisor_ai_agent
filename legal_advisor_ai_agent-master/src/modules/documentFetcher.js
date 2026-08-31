import { getDocument } from "../clients/indianKanoonClient.js";
import { getMockDocument } from "../fixtures/kanoonDocument.js";
import { config } from "../config.js";
import * as logger from "../lib/logger.js";

// Module 2 already ranks candidates best-first and applies its own floor
// logic so it never returns literally nothing — so here we mostly just cap
// the number of (billed) full-document fetches rather than re-filtering on
// score. The one exception: a candidate Module 2's scorer explicitly rated
// 0/10 ("unrelated", per that rubric) is skipped even if there's room under
// the cap, since fetching its full text would be pure waste. Everything else
// — including weak floor-kept results at 2-4/10 — is still fetched, since
// Module 4 and the end user are meant to see and judge borderline matches
// themselves, not have them silently dropped a second time.
const MAX_DOCS_TO_FETCH = 8;

function selectCandidates(candidates, maxDocs) {
  return candidates.filter((c) => c.relevanceScore !== 0).slice(0, maxDocs);
}

function decodeHtmlEntities(text = "") {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Strips Indian Kanoon's /doc/ HTML down to plain text, preserving paragraph breaks. */
function htmlToPlainText(html = "") {
  const withBreaks = html.replace(/<(br\s*\/?|\/p|\/div|\/h[1-6]|\/li)>/gi, "\n");
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  return decodeHtmlEntities(stripped)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Best-effort extraction of a labeled `<h3 class="...">Label: <a>Value</a></h3>` field. */
function extractLabeledField(html, className) {
  const regex = new RegExp(`<h3 class="${className}">[^:]*:\\s*(?:<a[^>]*>)?([^<]+)`, "i");
  const match = html.match(regex);
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

function buildSourceUrl(tid) {
  return `https://indiankanoon.org/doc/${tid}/`;
}

/** Merges Module 2's candidate metadata with the fetched full document. */
function toFullCase(candidate, doc) {
  const rawHtml = doc.doc ?? "";
  const fullText = htmlToPlainText(rawHtml);

  return {
    ...candidate,
    fullText,
    fullTextLength: fullText.length,
    sourceUrl: buildSourceUrl(candidate.tid),
    author: candidate.author ?? extractLabeledField(rawHtml, "doc_author"),
    bench: extractLabeledField(rawHtml, "doc_bench"),
  };
}

/**
 * Module 3: Document Fetcher
 * Input: ranked candidates from Module 2 (each with tid, title, docsource,
 *        relevanceScore, etc.)
 * Output: array of full case data — Module 2's metadata plus { fullText,
 *         fullTextLength, sourceUrl, author, bench } — for candidates that
 *         were selected and fetched successfully. Fetch failures or
 *         malformed responses are logged and skipped, not thrown.
 */
export async function fetchDocuments(candidates, { maxDocs = MAX_DOCS_TO_FETCH } = {}) {
  const selected = selectCandidates(candidates, maxDocs);
  logger.info(
    `  selected ${selected.length}/${candidates.length} candidate(s) for full-text fetch (cap=${maxDocs}, excluding score=0)`
  );

  const results = [];

  for (const candidate of selected) {
    logger.info(
      `  fetching tid=${candidate.tid} (score=${candidate.relevanceScore ?? "n/a"}/10) — ${candidate.title}`
    );

    let doc;
    try {
      doc = await getDocument(candidate.tid, {
        mockResponse: config.indianKanoonMock ? getMockDocument(candidate.tid) : undefined,
      });
    } catch (err) {
      logger.warn(`    fetch failed for tid=${candidate.tid}: ${err.message} — skipping.`);
      continue;
    }

    if (!doc || typeof doc.doc !== "string" || doc.doc.trim().length === 0) {
      logger.warn(`    tid=${candidate.tid} returned no usable document text — skipping.`);
      continue;
    }

    results.push(toFullCase(candidate, doc));
  }

  return results;
}

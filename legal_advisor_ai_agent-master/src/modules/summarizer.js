import { callModelJSON } from "../clients/llmClient.js";
import { SAFETY_CONSTRAINTS, DISCLAIMER } from "../lib/safetyConstraints.js";

// Full judgment text can run well past 250KB (seen in Module 3 testing). Most
// reasoning-tier models could technically fit that in context, but feeding it
// in full is expensive and slow to repeat per candidate (up to several per
// case). Cap it, keeping a larger tail than head: Indian judgments generally
// front-load procedural history/facts and put the actual reasoning/ratio
// decidendi and final order near the end — that's what we most need to keep
// if something has to be cut.
const MAX_FULLTEXT_CHARS = 45000;
const HEAD_CHARS = 15000;
const TAIL_CHARS = MAX_FULLTEXT_CHARS - HEAD_CHARS;

function truncateForSummarization(fullText = "") {
  if (fullText.length <= MAX_FULLTEXT_CHARS) return fullText;

  const omitted = fullText.length - MAX_FULLTEXT_CHARS;
  const head = fullText.slice(0, HEAD_CHARS);
  const tail = fullText.slice(fullText.length - TAIL_CHARS);
  return `${head}\n\n[... ${omitted} characters omitted for length; the judgment's reasoning and final order should appear in the excerpt below, taken from near the end of the document ...]\n\n${tail}`;
}

const SYSTEM_PROMPT = `
You are a legal research assistant producing a structured summary of an
Indian Supreme Court / High Court judgment, specifically to help a user
understand how it relates to their own legal situation.

You will be given the user's original case context (category, key facts,
parties) and the full text (or a head+tail excerpt, if the original was very
long) of one retrieved judgment, plus its metadata.

Produce a structured summary with:
- facts: the facts of THIS judgment (not the user's situation) — what
  happened between the parties in this case, per the judgment text
- legalIssue: the key legal question the court had to decide
- arguments: an array of { "side": string, "argument": string } describing
  what each side argued. Use whatever party labels actually fit this case
  (e.g. "Petitioner"/"Respondent" for a writ petition, "Appellant"/
  "Respondent" for an appeal, "Prosecution"/"Defense" for a criminal trial)
  — do not force a fixed pair of labels that don't match the case type.
- decision: the court's decision and reasoning (ratio decidendi) — what the
  court held and why
- relevanceAnalysis: specifically how THIS case relates to the user's
  situation, referencing the user's actual facts (not generic language)

Do NOT include any Indian Kanoon URLs, doc links, or citation links anywhere
in your response — not even for other cases mentioned or cited within this
judgment's text. The correct source URL for THIS case is already attached
separately by the system from verified metadata; you don't have verified
URLs for any other case, and fabricating one (even a plausible-looking one)
is a factual error. If you want to reference another case cited in the
judgment, name it and its citation if given in the text, but never invent a
URL for it.

Respond with ONLY a JSON object of this shape:
{
  "facts": string,
  "legalIssue": string,
  "arguments": [{ "side": string, "argument": string }, ...],
  "decision": string,
  "relevanceAnalysis": string
}

${SAFETY_CONSTRAINTS}
`.trim();

const REQUIRED_FIELDS = ["facts", "legalIssue", "arguments", "decision", "relevanceAnalysis"];

function validateShape(result) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in result)) {
      throw new Error(
        `Summarizer output is missing required field "${field}". Got: ${JSON.stringify(result)}`
      );
    }
  }

  if (!Array.isArray(result.arguments) || result.arguments.length === 0) {
    throw new Error(
      `Expected "arguments" to be a non-empty array. Got: ${JSON.stringify(result.arguments)}`
    );
  }

  for (const item of result.arguments) {
    if (typeof item !== "object" || item === null || typeof item.side !== "string" || typeof item.argument !== "string") {
      throw new Error(`Each "arguments" entry must be { side, argument }. Got: ${JSON.stringify(item)}`);
    }
  }
}

/**
 * Module 4: Case Summarizer & Relevance Analyzer
 * Input: one full case (Module 3 output: fullText + metadata incl.
 *        relevanceScore, sourceUrl) plus the user's context (Module 1 output)
 * Output: {
 *   tid, title, court, date, sourceUrl, relevanceScore,
 *   facts, legalIssue, arguments, decision, relevanceAnalysis, disclaimer
 * }
 */
export async function summarizeCase(fullCase, userContext) {
  const prompt = JSON.stringify({
    userContext: {
      rawDescription: userContext.rawDescription ?? null,
      category: userContext.category,
      keyFacts: userContext.keyFacts,
      parties: userContext.parties,
    },
    caseMetadata: {
      title: fullCase.title,
      court: fullCase.court,
      date: fullCase.date,
      author: fullCase.author,
      bench: fullCase.bench,
    },
    judgmentText: truncateForSummarization(fullCase.fullText),
  });

  const result = await callModelJSON(prompt, SYSTEM_PROMPT, "reasoning");
  validateShape(result);

  return {
    tid: fullCase.tid,
    title: fullCase.title,
    court: fullCase.court,
    date: fullCase.date,
    sourceUrl: fullCase.sourceUrl,
    relevanceScore: fullCase.relevanceScore,
    facts: result.facts,
    legalIssue: result.legalIssue,
    arguments: result.arguments,
    decision: result.decision,
    relevanceAnalysis: result.relevanceAnalysis,
    disclaimer: DISCLAIMER,
  };
}

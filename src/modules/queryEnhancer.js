import { callModelJSON } from "../clients/llmClient.js";
import { SAFETY_CONSTRAINTS } from "../lib/safetyConstraints.js";

const SYSTEM_PROMPT = `
You are a legal research assistant that extracts structured information from
a plain-language description of a legal situation in the Indian legal system,
and turns it into optimized search queries for finding similar Supreme Court
and High Court judgments on Indian Kanoon.

Given the user's description, extract:
- category: the case category/type (e.g., "property dispute", "motor accident",
  "criminal", "matrimonial", "contract dispute", "consumer dispute", etc.)
- relevantSections: an array of IPC sections, CrPC sections, or named Acts that
  appear relevant based on the facts described (e.g., ["Section 447 IPC",
  "Section 34 Specific Relief Act"]). Use an empty array if none can be
  identified confidently from the facts — do not guess sections that aren't
  supported by the description.
- keyFacts: a concise (2-4 sentence) neutral summary of the key facts.
- parties: an object with EXACTLY two keys, literally named "user" and
  "otherParty" (do not rename "otherParty" to something contextual like
  "neighbor" or "landlord" — the key name must always be "otherParty").
  Each value is a plain-text description of that party's role, e.g.
  { "user": "property owner whose wall was damaged", "otherParty": "neighbor
  who conducted the construction causing the damage" }.
- jurisdiction: the Indian state, or "Supreme Court" / "High Court of X", if
  mentioned or clearly inferable from the description, otherwise null. Do not
  guess a jurisdiction that isn't supported by the text.
- searchQueries: an array of 2-3 optimized search query strings suitable for
  searching Indian Kanoon for similar cases. Each should be a short phrase
  (not a full sentence) combining the legal category, relevant sections/acts,
  and key legal concepts — the kind of phrase a lawyer would type into a case
  law search engine.

Respond with ONLY a single JSON object, no markdown formatting, no
commentary, matching exactly this shape:
{
  "category": string,
  "relevantSections": string[],
  "keyFacts": string,
  "parties": { "user": string, "otherParty": string },
  "jurisdiction": string | null,
  "searchQueries": string[]
}

${SAFETY_CONSTRAINTS}
`.trim();

const REQUIRED_FIELDS = [
  "category",
  "relevantSections",
  "keyFacts",
  "parties",
  "jurisdiction",
  "searchQueries",
];

/**
 * Module 1: Query Enhancer
 * Input: raw plain-language case description
 * Output: {
 *   category: string,
 *   relevantSections: string[],
 *   keyFacts: string,
 *   parties: { user: string, otherParty: string },
 *   jurisdiction: string | null,
 *   searchQueries: string[]
 * }
 */
// Low temperature: extraction/query-generation should be consistent between
// runs on the same input, not creative — instability here was traced as one
// cause of Module 2's relevance scores shifting run-to-run on identical input.
const EXTRACTION_TEMPERATURE = 0.15;

export async function enhanceQuery(rawDescription) {
  const result = await callModelJSON(rawDescription, SYSTEM_PROMPT, "extraction", {
    temperature: EXTRACTION_TEMPERATURE,
  });
  normalizePartiesKey(result);
  validateShape(result);
  return result;
}

/**
 * Despite the prompt insisting on a literal "otherParty" key, the model
 * occasionally names it after the party's role instead (e.g. "neighbor").
 * If "user" is present but "otherParty" isn't, and there's exactly one other
 * key, treat it as "otherParty" rather than hard-failing the whole pipeline.
 */
function normalizePartiesKey(result) {
  const parties = result?.parties;
  if (typeof parties !== "object" || parties === null) return;
  if ("otherParty" in parties || !("user" in parties)) return;

  const otherKeys = Object.keys(parties).filter((k) => k !== "user");
  if (otherKeys.length === 1) {
    parties.otherParty = parties[otherKeys[0]];
    delete parties[otherKeys[0]];
  }
}

function validateShape(result) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in result)) {
      throw new Error(
        `Query enhancer output is missing required field "${field}". Got: ${JSON.stringify(result)}`
      );
    }
  }

  if (!Array.isArray(result.relevantSections)) {
    throw new Error(
      `Expected "relevantSections" to be an array. Got: ${JSON.stringify(result.relevantSections)}`
    );
  }

  if (!Array.isArray(result.searchQueries) || result.searchQueries.length === 0) {
    throw new Error(
      `Expected "searchQueries" to be a non-empty array. Got: ${JSON.stringify(result.searchQueries)}`
    );
  }

  const parties = result.parties;
  if (typeof parties !== "object" || parties === null || !("user" in parties) || !("otherParty" in parties)) {
    throw new Error(
      `Expected "parties" to be { user, otherParty }. Got: ${JSON.stringify(parties)}`
    );
  }
}

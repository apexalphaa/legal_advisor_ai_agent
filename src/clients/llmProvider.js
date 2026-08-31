/**
 * Shared interface every LLM provider client must implement, so they are
 * interchangeable behind llmClient.js.
 *
 * @typedef {"extraction"|"reasoning"} ModelTier
 *   "extraction" -> fast/cheap model, used for structured-data extraction (Module 1).
 *   "reasoning"  -> stronger model, used for summarization/synthesis (Modules 4, 5).
 *
 * @typedef {object} CallOptions
 * @property {number} [temperature] - lower reduces output variance between runs
 *
 * @typedef {object} LLMProvider
 * @property {(prompt: string, systemPrompt: string, tier: ModelTier, options?: CallOptions) => Promise<string>} callModel
 * @property {(prompt: string, systemPrompt: string, tier: ModelTier, options?: CallOptions) => Promise<any>} callModelJSON
 * @property {() => void} assertConfigured
 *   Throws a clear, actionable error if this provider's API key is missing.
 */

const REQUIRED_METHODS = ["callModel", "callModelJSON", "assertConfigured"];

/** Throws if `provider` does not implement the LLMProvider shape above. */
export function assertImplementsProvider(provider, name) {
  for (const method of REQUIRED_METHODS) {
    if (typeof provider[method] !== "function") {
      throw new Error(`LLM provider "${name}" is missing required method "${method}"`);
    }
  }
}

/** Strips a markdown code fence (```json ... ```) and parses the remainder as JSON. */
export function parseJSONResponse(raw, providerName) {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Failed to parse ${providerName} response as JSON: ${err.message}\nRaw response:\n${raw}`
    );
  }
}

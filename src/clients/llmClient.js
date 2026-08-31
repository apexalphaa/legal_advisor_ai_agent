import { config } from "../config.js";
import anthropicClient from "./anthropicClient.js";
import geminiClient from "./geminiClient.js";
import groqClient from "./groqClient.js";
import nvidiaClient from "./nvidiaClient.js";
import azureOpenAIClient from "./azureOpenAIClient.js";
import { assertImplementsProvider } from "./llmProvider.js";

const PROVIDERS = {
  anthropic: anthropicClient,
  gemini: geminiClient,
  groq: groqClient,
  nvidia: nvidiaClient,
  azure: azureOpenAIClient,
};

function getProvider() {
  const provider = PROVIDERS[config.llmProvider];
  if (!provider) {
    throw new Error(
      `Unknown LLM_PROVIDER "${config.llmProvider}". Expected one of: ${Object.keys(PROVIDERS).join(", ")}.`
    );
  }
  assertImplementsProvider(provider, config.llmProvider);
  return provider;
}

export const providerName = config.llmProvider;

/** Call at startup, before running the pipeline, to fail fast with a clear message. */
export function assertConfigured() {
  getProvider().assertConfigured();
}

export function callModel(prompt, systemPrompt, tier, options) {
  return getProvider().callModel(prompt, systemPrompt, tier, options);
}

export function callModelJSON(prompt, systemPrompt, tier, options) {
  return getProvider().callModelJSON(prompt, systemPrompt, tier, options);
}

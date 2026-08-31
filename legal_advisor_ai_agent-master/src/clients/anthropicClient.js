import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { parseJSONResponse } from "./llmProvider.js";

let client;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: config.anthropic.apiKey });
  }
  return client;
}

function resolveModel(tier) {
  const model = config.anthropic.models[tier];
  if (!model) {
    throw new Error(`Unknown model tier "${tier}" for Anthropic provider.`);
  }
  return model;
}

async function callModel(prompt, systemPrompt, tier, { temperature } = {}) {
  const response = await getClient().messages.create({
    model: resolveModel(tier),
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
    ...(temperature !== undefined ? { temperature } : {}),
  });

  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

async function callModelJSON(prompt, systemPrompt, tier, options) {
  const raw = await callModel(prompt, systemPrompt, tier, options);
  return parseJSONResponse(raw, "Anthropic");
}

function assertConfigured() {
  if (!config.anthropic.apiKey) {
    throw new Error(
      "LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set. Add it to .env " +
        "(get one at https://console.anthropic.com/)."
    );
  }
}

export default { callModel, callModelJSON, assertConfigured };

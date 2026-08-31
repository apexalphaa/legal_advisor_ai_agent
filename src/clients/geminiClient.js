import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";
import { parseJSONResponse } from "./llmProvider.js";

let client;

function getClient() {
  if (!client) {
    client = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return client;
}

function resolveModel(tier) {
  const model = config.gemini.models[tier];
  if (!model) {
    throw new Error(`Unknown model tier "${tier}" for Gemini provider.`);
  }
  return model;
}

async function callModel(prompt, systemPrompt, tier, { temperature } = {}) {
  const model = getClient().getGenerativeModel({
    model: resolveModel(tier),
    systemInstruction: systemPrompt,
    ...(temperature !== undefined ? { generationConfig: { temperature } } : {}),
  });

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

async function callModelJSON(prompt, systemPrompt, tier, options) {
  const raw = await callModel(prompt, systemPrompt, tier, options);
  return parseJSONResponse(raw, "Gemini");
}

function assertConfigured() {
  if (!config.gemini.apiKey) {
    throw new Error(
      "LLM_PROVIDER=gemini but GEMINI_API_KEY is not set. Add it to .env " +
        "(get a free key at https://aistudio.google.com/apikey)."
    );
  }
}

export default { callModel, callModelJSON, assertConfigured };

import { config } from "../config.js";
import { parseJSONResponse } from "./llmProvider.js";

// Groq exposes an OpenAI-compatible REST API — plain fetch is enough, no
// need for an SDK dependency just for one chat-completions call shape.
const BASE_URL = "https://api.groq.com/openai/v1";

function resolveModel(tier) {
  const model = config.groq.models[tier];
  if (!model) {
    throw new Error(`Unknown model tier "${tier}" for Groq provider.`);
  }
  return model;
}

async function callModel(prompt, systemPrompt, tier, { temperature } = {}) {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.groq.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: resolveModel(tier),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      ...(temperature !== undefined ? { temperature } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Groq API request failed: ${response.status} ${response.statusText}\n${body}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error(`Unexpected Groq response shape: ${JSON.stringify(data)}`);
  }
  return text.trim();
}

async function callModelJSON(prompt, systemPrompt, tier, options) {
  const raw = await callModel(prompt, systemPrompt, tier, options);
  return parseJSONResponse(raw, "Groq");
}

function assertConfigured() {
  if (!config.groq.apiKey) {
    throw new Error(
      "LLM_PROVIDER=groq but GROQ_API_KEY is not set. Add it to .env " +
        "(get a free key at https://console.groq.com/keys)."
    );
  }
}

export default { callModel, callModelJSON, assertConfigured };

import { config } from "../config.js";
import { parseJSONResponse } from "./llmProvider.js";

// NVIDIA NIM exposes an OpenAI-compatible REST API — plain fetch is enough,
// no need for an SDK dependency just for one chat-completions call shape.
const BASE_URL = "https://integrate.api.nvidia.com/v1";

// Rate-limit note: NVIDIA NIM's free/dev tier caps at ~40 requests/minute
// (not token-based, unlike Groq). A single pipeline run makes at most ~11
// reasoning/extraction-tier calls total (1 for Module 1, 1 for Module 2's
// relevance scoring, up to 8 for Module 4, 1 for Module 5) — comfortably
// under 40/min even unthrottled, so no Groq-style inter-call delay is added
// here. The one realistic way to approach the cap is NOT within a single
// run, but from MULTIPLE CONCURRENT pipeline runs: src/server.js has no
// request queue or concurrency limit, so several overlapping /api/case
// requests (e.g. a few users hitting the frontend at the same moment) could
// stack their Module 4 calls together in real wall-clock time. Worth adding
// a concurrency limit or per-provider throttle if that becomes a real usage
// pattern; not needed for today's single-user testing.
function resolveModel(tier) {
  const model = config.nvidia.models[tier];
  if (!model) {
    throw new Error(`Unknown model tier "${tier}" for NVIDIA provider.`);
  }
  return model;
}

async function callModel(prompt, systemPrompt, tier, { temperature } = {}) {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.nvidia.apiKey}`,
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
    throw new Error(`NVIDIA NIM API request failed: ${response.status} ${response.statusText}\n${body}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error(`Unexpected NVIDIA NIM response shape: ${JSON.stringify(data)}`);
  }
  return text.trim();
}

async function callModelJSON(prompt, systemPrompt, tier, options) {
  const raw = await callModel(prompt, systemPrompt, tier, options);
  return parseJSONResponse(raw, "NVIDIA NIM");
}

function assertConfigured() {
  if (!config.nvidia.apiKey) {
    throw new Error(
      "LLM_PROVIDER=nvidia but NVIDIA_API_KEY is not set. Add it to .env " +
        "(get a free key at https://build.nvidia.com/ — open any model card and click \"Get API Key\")."
    );
  }
}

export default { callModel, callModelJSON, assertConfigured };

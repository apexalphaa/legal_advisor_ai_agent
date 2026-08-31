import { config } from "../config.js";
import { parseJSONResponse } from "./llmProvider.js";

// gpt-5-family and o-series (o1/o3/o4) reasoning deployments only support
// the default temperature and error out if a custom one is passed — same
// precaution as the reference config this integration is based on.
const NO_CUSTOM_TEMPERATURE_PATTERN = /gpt-5|o1|o3|o4/i;

function resolveDeployment(tier) {
  const deployment = config.azure.deployments[tier] || config.azure.chatDeployment;
  if (!deployment) {
    throw new Error(`No Azure OpenAI deployment configured for tier "${tier}".`);
  }
  return deployment;
}

async function callModel(prompt, systemPrompt, tier, { temperature } = {}) {
  const deployment = resolveDeployment(tier);
  const url =
    `${config.azure.endpoint}/openai/deployments/${deployment}/chat/completions` +
    `?api-version=${config.azure.apiVersion}`;

  const body = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  };

  if (temperature !== undefined && !NO_CUSTOM_TEMPERATURE_PATTERN.test(deployment)) {
    body.temperature = temperature;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": config.azure.apiKey, // Azure uses api-key, not Authorization: Bearer
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Azure OpenAI API request failed: ${response.status} ${response.statusText}\n${text}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error(`Unexpected Azure OpenAI response shape: ${JSON.stringify(data)}`);
  }
  return text.trim();
}

async function callModelJSON(prompt, systemPrompt, tier, options) {
  const raw = await callModel(prompt, systemPrompt, tier, options);
  return parseJSONResponse(raw, "Azure OpenAI");
}

function assertConfigured() {
  const missing = [];
  if (!config.azure.apiKey) missing.push("AZURE_OPENAI_API_KEY");
  if (!config.azure.endpoint) missing.push("AZURE_OPENAI_ENDPOINT");
  if (!config.azure.chatDeployment) missing.push("AZURE_OPENAI_CHAT_DEPLOYMENT");

  if (missing.length > 0) {
    throw new Error(
      `LLM_PROVIDER=azure but missing required .env variable(s): ${missing.join(", ")}.`
    );
  }
}

export default { callModel, callModelJSON, assertConfigured };

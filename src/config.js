import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "url";

loadEnv();

function bool(value, fallback) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

export const config = {
  llmProvider: (process.env.LLM_PROVIDER || "anthropic").toLowerCase(),

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    models: {
      extraction: process.env.ANTHROPIC_MODEL_EXTRACTION || "claude-haiku-4-5-20251001",
      reasoning: process.env.ANTHROPIC_MODEL_REASONING || "claude-sonnet-5",
    },
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    models: {
      // Free-tier-eligible Gemini models via Google AI Studio API keys.
      // Deliberately avoiding "-pro" models here: they carry a much stricter
      // free-tier rate limit that would bottleneck Modules 4/5 (one call per case).
      extraction: process.env.GEMINI_MODEL_EXTRACTION || "gemini-3.5-flash-lite",
      reasoning: process.env.GEMINI_MODEL_REASONING || "gemini-3.5-flash",
    },
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    models: {
      // Groq has deprecated its plain llama-3.x chat models since these
      // defaults were first picked — verified against the live /models
      // endpoint on 2026-08-31; confirmed working via a real completion call.
      // Fast/cheap for testing bot plumbing — not tuned for output quality.
      extraction: process.env.GROQ_MODEL_EXTRACTION || "openai/gpt-oss-20b",
      reasoning: process.env.GROQ_MODEL_REASONING || "openai/gpt-oss-120b",
    },
  },

  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY || "",
    models: {
      // Meta's Llama 3.1/3.3 Instruct models, confirmed via NVIDIA's own
      // docs/NGC catalog (not live-tested — no NVIDIA key available here).
      extraction: process.env.NVIDIA_MODEL_EXTRACTION || "meta/llama-3.1-8b-instruct",
      reasoning: process.env.NVIDIA_MODEL_REASONING || "meta/llama-3.3-70b-instruct",
    },
  },

  azure: {
    apiKey: process.env.AZURE_OPENAI_API_KEY || "",
    // Strip any trailing slash so URL building never ends up with "//openai/...".
    endpoint: (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/+$/, ""),
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview",
    chatDeployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || "",
    // Optional per-tier overrides; fall back to chatDeployment when unset
    // (most setups only have one deployment, not separate ones per tier).
    deployments: {
      extraction: process.env.AZURE_OPENAI_DEPLOYMENT_EXTRACTION || "",
      reasoning: process.env.AZURE_OPENAI_DEPLOYMENT_REASONING || "",
    },
  },

  indianKanoonToken: process.env.INDIAN_KANOON_API_TOKEN || "",
  indianKanoonMock: bool(process.env.INDIAN_KANOON_MOCK, true),

  paths: {
    dataDir: fileURLToPath(new URL("../data/", import.meta.url)),
  },
};

export function assertKanoonConfigured() {
  if (!config.indianKanoonMock && !config.indianKanoonToken) {
    throw new Error(
      "INDIAN_KANOON_API_TOKEN is not set and INDIAN_KANOON_MOCK is not true. " +
        "Either add a token to .env, or set INDIAN_KANOON_MOCK=true to use fixture data."
    );
  }
}

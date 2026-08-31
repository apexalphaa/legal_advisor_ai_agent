import express from "express";
import cors from "cors";
import { runPipeline } from "./orchestrator.js";
import { assertConfigured, providerName } from "./clients/llmClient.js";
import * as logger from "./lib/logger.js";

const PORT = Number(process.env.PORT) || 3000;

// Full pipeline runs can involve up to 8 reasoning-tier LLM calls in Module 4
// (one per fetched document) plus one more in Module 5, on top of Module 2/3's
// own Indian Kanoon calls. Testing so far has seen roughly 15-30s per
// reasoning-tier call, so a worst-case 8-document run could plausibly
// approach 3-4 minutes; we don't yet have real timing data for a full
// 8-document run specifically, so this is padded generously. Override via
// API_TIMEOUT_MS in .env once real numbers are in.
const REQUEST_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS) || 5 * 60 * 1000;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", provider: providerName });
});

app.post("/api/case", async (req, res) => {
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  const startedAt = Date.now();
  const snippet = description.length > 80 ? `${description.slice(0, 80)}...` : description;

  if (!description) {
    logger.warn(`[api] POST /api/case rejected — description is missing or empty`);
    return res.status(400).json({ error: "description is required and must be a non-empty string." });
  }

  logger.info(`[api] POST /api/case — "${snippet}"`);

  try {
    const result = await runPipeline(description);
    logger.info(`[api] POST /api/case succeeded in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
    res.status(200).json(result);
  } catch (err) {
    logger.error(
      `[api] POST /api/case failed after ${((Date.now() - startedAt) / 1000).toFixed(1)}s: ${err.message}`
    );
    res.status(500).json({ error: err.message });
  }
});

// Express's default error handler returns an HTML page; keep responses JSON,
// e.g. for malformed request bodies caught by express.json().
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body." });
  }
  return res.status(500).json({ error: err.message });
});

function start() {
  assertConfigured();
  const server = app.listen(PORT, () => {
    logger.info(`API server listening on http://localhost:${PORT} (LLM provider: ${providerName})`);
  });
  server.timeout = REQUEST_TIMEOUT_MS;
  return server;
}

try {
  start();
} catch (err) {
  logger.error(err.message);
  process.exit(1);
}

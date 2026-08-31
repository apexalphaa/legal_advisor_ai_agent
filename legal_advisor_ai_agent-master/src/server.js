import express from "express";
import cors from "cors";
import { runPipeline } from "./orchestrator.js";
import { assertConfigured, providerName } from "./clients/llmClient.js";
import * as logger from "./lib/logger.js";

const PORT = Number(process.env.PORT) || 3000;
const REQUEST_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS) || 5 * 60 * 1000;

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    name: "Indian Case Law Research Assistant API",
    status: "ok",
    health: "/api/health",
    caseEndpoint: "POST /api/case",
    provider: providerName,
  });
});

app.get("/api/health", (req, res) => {
  let configured = true;
  let configurationError = null;

  try {
    assertConfigured();
  } catch (err) {
    configured = false;
    configurationError = err.message;
  }

  res.status(configured ? 200 : 503).json({
    status: configured ? "ok" : "misconfigured",
    provider: providerName,
    configured,
    ...(configurationError ? { configurationError } : {}),
    vercel: process.env.VERCEL === "1",
  });
});

app.post("/api/case", async (req, res) => {
  const description =
    typeof req.body?.description === "string" ? req.body.description.trim() : "";

  const startedAt = Date.now();
  const snippet =
    description.length > 80 ? `${description.slice(0, 80)}...` : description;

  if (!description) {
    logger.warn("[api] POST /api/case rejected — description is missing or empty");
    return res.status(400).json({
      error: "description is required and must be a non-empty string.",
    });
  }

  try {
    // Validate configuration inside the request instead of terminating the
    // serverless process during module initialization.
    assertConfigured();

    logger.info(`[api] POST /api/case — "${snippet}"`);

    const result = await runPipeline(description);

    logger.info(
      `[api] POST /api/case succeeded in ${(
        (Date.now() - startedAt) /
        1000
      ).toFixed(1)}s`
    );

    return res.status(200).json(result);
  } catch (err) {
    logger.error(
      `[api] POST /api/case failed after ${(
        (Date.now() - startedAt) /
        1000
      ).toFixed(1)}s: ${err?.stack || err?.message || err}`
    );

    return res.status(500).json({
      error: err?.message || "Internal server error.",
    });
  }
});

app.use((err, req, res, next) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body." });
  }

  logger.error(`[api] Unhandled Express error: ${err?.stack || err?.message || err}`);
  return res.status(500).json({
    error: err?.message || "Internal server error.",
  });
});

// Vercel imports the Express app. For local `npm run start:api`, keep the
// normal long-running HTTP server behavior.
function start() {
  assertConfigured();

  const server = app.listen(PORT, () => {
    logger.info(
      `API server listening on http://localhost:${PORT} (LLM provider: ${providerName})`
    );
  });

  server.timeout = REQUEST_TIMEOUT_MS;
  return server;
}

export default app;
export { app, start };

if (process.env.VERCEL !== "1") {
  try {
    start();
  } catch (err) {
    logger.error(err?.stack || err?.message || err);
    process.exit(1);
  }
}

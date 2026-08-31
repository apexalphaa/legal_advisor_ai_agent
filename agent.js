import { runPipeline } from "./src/orchestrator.js";
import { assertConfigured, providerName } from "./src/clients/llmClient.js";
import * as logger from "./src/lib/logger.js";

const rawDescription = process.argv.slice(2).join(" ").trim();

if (!rawDescription) {
  console.error(
    'Usage: node agent.js "<plain-language description of your legal situation>"'
  );
  process.exit(1);
}

try {
  assertConfigured();
  logger.info(`Using LLM provider: ${providerName}`);
  await runPipeline(rawDescription);
} catch (err) {
  logger.error(err.message);
  process.exit(1);
}

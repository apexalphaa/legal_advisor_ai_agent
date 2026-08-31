import { enhanceQuery } from "../src/modules/queryEnhancer.js";
import { assertConfigured, providerName } from "../src/clients/llmClient.js";
import { SAMPLE_CASE_DESCRIPTIONS as SAMPLES } from "../src/fixtures/sampleCaseDescriptions.js";
import * as logger from "../src/lib/logger.js";

async function main() {
  assertConfigured();
  logger.info(`Using LLM provider: ${providerName}`);

  for (const [i, description] of SAMPLES.entries()) {
    logger.step(`sample ${i + 1}/${SAMPLES.length}`, description);
    try {
      const result = await enhanceQuery(description);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      logger.error(err.message);
    }
    console.log("-".repeat(70));
  }
}

main();

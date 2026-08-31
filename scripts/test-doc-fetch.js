import { enhanceQuery } from "../src/modules/queryEnhancer.js";
import { searchCases } from "../src/modules/caseSearch.js";
import { fetchDocuments } from "../src/modules/documentFetcher.js";
import { assertConfigured, providerName } from "../src/clients/llmClient.js";
import { config } from "../src/config.js";
import { SAMPLE_CASE_DESCRIPTIONS } from "../src/fixtures/sampleCaseDescriptions.js";
import * as logger from "../src/lib/logger.js";

async function main() {
  assertConfigured();
  logger.info(`LLM provider: ${providerName}`);
  logger.info(
    config.indianKanoonMock
      ? "Indian Kanoon: MOCK fixture data"
      : "Indian Kanoon: LIVE API calls (INDIAN_KANOON_MOCK=false)"
  );

  for (const [i, description] of SAMPLE_CASE_DESCRIPTIONS.entries()) {
    logger.step(`sample ${i + 1}/${SAMPLE_CASE_DESCRIPTIONS.length}`, description);

    const enhanced = await enhanceQuery(description);
    const candidates = await searchCases(enhanced);
    logger.info(`  Module 2 returned ${candidates.length} candidate(s).`);

    const fullCases = await fetchDocuments(candidates);
    logger.info(`  Module 3: ${fullCases.length} document(s) fetched successfully.`);

    for (const [j, fc] of fullCases.entries()) {
      console.log(
        `    [${j + 1}] tid=${fc.tid} | score=${fc.relevanceScore ?? "n/a"}/10 | textLength=${fc.fullTextLength} chars | ${fc.title}`
      );
      console.log(`        sourceUrl: ${fc.sourceUrl}`);
      console.log(`        author: ${fc.author ?? "(none)"} | bench: ${fc.bench ?? "(none)"}`);
    }

    console.log("-".repeat(70));
  }
}

main().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});

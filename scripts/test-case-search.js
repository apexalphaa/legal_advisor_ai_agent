import { enhanceQuery } from "../src/modules/queryEnhancer.js";
import { searchCases } from "../src/modules/caseSearch.js";
import { assertConfigured, providerName } from "../src/clients/llmClient.js";
import { config } from "../src/config.js";
import { SAMPLE_CASE_DESCRIPTIONS } from "../src/fixtures/sampleCaseDescriptions.js";
import * as logger from "../src/lib/logger.js";

async function main() {
  assertConfigured();
  logger.info(`LLM provider: ${providerName}`);

  const usingLiveKanoon = !config.indianKanoonMock && !!config.indianKanoonToken;
  logger.info(
    usingLiveKanoon
      ? "Indian Kanoon: LIVE API calls (INDIAN_KANOON_MOCK=false, token present)"
      : "Indian Kanoon: MOCK fixture data (set INDIAN_KANOON_MOCK=false in .env with a real token to test live)"
  );

  for (const [i, description] of SAMPLE_CASE_DESCRIPTIONS.entries()) {
    logger.step(`sample ${i + 1}/${SAMPLE_CASE_DESCRIPTIONS.length}`, description);

    const enhanced = await enhanceQuery(description);
    logger.info(`  category: ${enhanced.category}`);
    logger.info(`  searchQueries: ${JSON.stringify(enhanced.searchQueries)}`);

    const candidates = await searchCases(enhanced);
    logger.info(`  ${candidates.length} candidate(s) after merge/dedup/limit:`);

    for (const [j, c] of candidates.entries()) {
      console.log(
        `    [${j + 1}] tid=${c.tid} | score=${c.relevanceScore}/10 | docsource="${c.court}" | ${c.date} | ${c.title}`
      );
      console.log(`        snippet: ${c.snippet.slice(0, 160)}${c.snippet.length > 160 ? "..." : ""}`);
    }

    console.log("-".repeat(70));
  }
}

main().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});

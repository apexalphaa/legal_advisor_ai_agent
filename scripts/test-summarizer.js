import { enhanceQuery } from "../src/modules/queryEnhancer.js";
import { searchCases } from "../src/modules/caseSearch.js";
import { fetchDocuments } from "../src/modules/documentFetcher.js";
import { summarizeCase } from "../src/modules/summarizer.js";
import { assertConfigured, providerName } from "../src/clients/llmClient.js";
import { config } from "../src/config.js";
import { SAMPLE_CASE_DESCRIPTIONS } from "../src/fixtures/sampleCaseDescriptions.js";
import { selectSamples } from "../src/lib/sampleSelection.js";
import * as logger from "../src/lib/logger.js";

// Capped low: this test runs the reasoning-tier model once per document, on
// top of the live Indian Kanoon fetch each document already costs.
const DOCS_PER_SAMPLE = 2;

async function main() {
  assertConfigured();
  logger.info(`LLM provider: ${providerName}`);
  logger.info(
    config.indianKanoonMock
      ? "Indian Kanoon: MOCK fixture data"
      : "Indian Kanoon: LIVE API calls (INDIAN_KANOON_MOCK=false)"
  );

  const samples = selectSamples(SAMPLE_CASE_DESCRIPTIONS);
  if (samples.length < SAMPLE_CASE_DESCRIPTIONS.length) {
    logger.info(
      `Running sample ${samples[0].index + 1}/${SAMPLE_CASE_DESCRIPTIONS.length} only ` +
        `(pass a different number 1-${SAMPLE_CASE_DESCRIPTIONS.length}, or omit to run all).`
    );
  }

  for (const { description, index: i } of samples) {
    logger.step(`sample ${i + 1}/${SAMPLE_CASE_DESCRIPTIONS.length}`, description);

    const enhanced = await enhanceQuery(description);
    const candidates = await searchCases(enhanced);
    const fullCases = await fetchDocuments(candidates, { maxDocs: DOCS_PER_SAMPLE });
    logger.info(`  Summarizing ${fullCases.length} case(s)...`);

    for (const [j, fc] of fullCases.entries()) {
      const summary = await summarizeCase(fc, { rawDescription: description, ...enhanced });

      console.log(`\n  [${j + 1}] ${summary.title}`);
      console.log(`      score=${summary.relevanceScore ?? "n/a"}/10 | court=${summary.court} | date=${summary.date}`);
      console.log(`      sourceUrl: ${summary.sourceUrl}`);
      console.log(`      facts: ${summary.facts}`);
      console.log(`      legalIssue: ${summary.legalIssue}`);
      console.log(`      arguments:`);
      for (const arg of summary.arguments) {
        console.log(`        - ${arg.side}: ${arg.argument}`);
      }
      console.log(`      decision: ${summary.decision}`);
      console.log(`      relevanceAnalysis: ${summary.relevanceAnalysis}`);
      console.log(`      disclaimer: ${summary.disclaimer}`);
    }

    console.log("\n" + "-".repeat(70));
  }
}

main().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});

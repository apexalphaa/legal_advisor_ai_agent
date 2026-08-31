import { enhanceQuery } from "../src/modules/queryEnhancer.js";
import { searchCases } from "../src/modules/caseSearch.js";
import { fetchDocuments } from "../src/modules/documentFetcher.js";
import { summarizeCase } from "../src/modules/summarizer.js";
import { synthesizeCases } from "../src/modules/synthesis.js";
import { assertConfigured, providerName } from "../src/clients/llmClient.js";
import { config } from "../src/config.js";
import { SAMPLE_CASE_DESCRIPTIONS } from "../src/fixtures/sampleCaseDescriptions.js";
import { selectSamples } from "../src/lib/sampleSelection.js";
import * as logger from "../src/lib/logger.js";

// Capped low: this test runs the reasoning-tier model once per document
// (Module 4) plus once more per sample (Module 5), on top of live Indian
// Kanoon fetches per document.
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

    const userContext = { rawDescription: description, ...enhanced };
    const caseSummaries = [];
    for (const fc of fullCases) {
      caseSummaries.push(await summarizeCase(fc, userContext));
    }

    logger.info(`  Synthesizing across ${caseSummaries.length} case(s)...`);
    const synthesis = await synthesizeCases(caseSummaries, userContext);

    console.log(`\n  === Synthesis for sample ${i + 1}: "${description}" ===`);
    console.log(`  input cases (title | score):`);
    for (const c of caseSummaries) {
      console.log(`    - ${c.title} | ${c.relevanceScore ?? "n/a"}/10`);
    }
    console.log(`\n  commonPatterns:\n  ${synthesis.commonPatterns}`);
    console.log(`\n  divergence:\n  ${synthesis.divergence}`);
    console.log(`\n  relevanceToUserCase:\n  ${synthesis.relevanceToUserCase}`);
    console.log(`\n  weakEvidenceNote:\n  ${synthesis.weakEvidenceNote}`);
    console.log(`\n  sources: ${JSON.stringify(synthesis.sources, null, 2)}`);
    console.log(`\n  disclaimer: ${synthesis.disclaimer}`);
    console.log("\n" + "-".repeat(70));
  }
}

main().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});

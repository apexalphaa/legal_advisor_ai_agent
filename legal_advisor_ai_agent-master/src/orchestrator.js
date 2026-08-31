import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { config } from "./config.js";
import * as logger from "./lib/logger.js";
import { enhanceQuery } from "./modules/queryEnhancer.js";
import { searchCases } from "./modules/caseSearch.js";
import { fetchDocuments } from "./modules/documentFetcher.js";
import { summarizeCase } from "./modules/summarizer.js";
import { synthesizeCases } from "./modules/synthesis.js";

function elapsed(startMs) {
  return `${((Date.now() - startMs) / 1000).toFixed(1)}s`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Groq's free tier caps at 8,000 tokens/minute, and a single Module 4 call
// can send up to ~45,000 chars of judgment text — enough to approach that
// ceiling by itself. Spacing consecutive calls out reduces how often a
// burst of several calls in the same minute trips the per-minute cap.
const GROQ_INTER_SUMMARY_DELAY_MS = 4000;

/**
 * Runs the full Module 1 -> 5 pipeline for one case description, logging
 * progress at each stage, and saves the combined result as JSON in data/.
 */
export async function runPipeline(rawDescription) {
  const startedAt = new Date();
  const pipelineStart = Date.now();

  logger.step("1/5", "Enhancing query...");
  let stageStart = Date.now();
  const enhanced = await enhanceQuery(rawDescription);
  logger.step(
    "1/5",
    `Done in ${elapsed(stageStart)} — category="${enhanced.category}", ` +
      `${enhanced.searchQueries.length} search quer${enhanced.searchQueries.length === 1 ? "y" : "ies"}.`
  );

  logger.step("2/5", "Searching Indian Kanoon...");
  stageStart = Date.now();
  const candidates = await searchCases(enhanced);
  logger.step("2/5", `Done in ${elapsed(stageStart)} — ${candidates.length} candidate case(s) after scoring/dedup.`);

  logger.step("3/5", "Fetching full judgment text...");
  stageStart = Date.now();
  const fullCases = await fetchDocuments(candidates);
  logger.step("3/5", `Done in ${elapsed(stageStart)} — ${fullCases.length} document(s) fetched successfully.`);

  logger.step("4/5", `Summarizing ${fullCases.length} case(s)...`);
  stageStart = Date.now();
  const userContext = { rawDescription, ...enhanced };
  const caseSummaries = [];
  for (const [i, fullCase] of fullCases.entries()) {
    if (i > 0 && config.llmProvider === "groq") {
      await sleep(GROQ_INTER_SUMMARY_DELAY_MS);
    }
    logger.step("4/5", `  case ${i + 1}/${fullCases.length}: ${fullCase.title}`);
    caseSummaries.push(await summarizeCase(fullCase, userContext));
  }
  logger.step("4/5", `Done in ${elapsed(stageStart)}.`);

  logger.step("5/5", "Synthesizing across cases...");
  stageStart = Date.now();
  const synthesis = await synthesizeCases(caseSummaries, userContext);
  logger.step("5/5", `Done in ${elapsed(stageStart)}.`);

  const result = {
    rawDescription,
    enhancedQuery: enhanced,
    caseSummaries,
    synthesis,
    generatedAt: startedAt.toISOString(),
    elapsedMs: Date.now() - pipelineStart,
  };

  const outPath = await saveResult(result, startedAt);
  logger.step(
    "done",
    `Pipeline complete in ${elapsed(pipelineStart)} — ${caseSummaries.length} case(s) summarized, ` +
      `${synthesis.sources.length} source(s) cited. Saved to ${outPath}`
  );

  return result;
}

async function saveResult(result, startedAt) {
  await mkdir(config.paths.dataDir, { recursive: true });
  const filename = `run-${startedAt.toISOString().replace(/[:.]/g, "-")}.json`;
  const outPath = path.join(config.paths.dataDir, filename);
  await writeFile(outPath, JSON.stringify(result, null, 2), "utf-8");
  return outPath;
}

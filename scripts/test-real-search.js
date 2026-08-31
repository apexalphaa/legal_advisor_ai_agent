import { config } from "../src/config.js";
import * as logger from "../src/lib/logger.js";

// One-off diagnostic: makes a single REAL call to /search/, ignoring
// INDIAN_KANOON_MOCK, so we can see the actual response shape before
// writing Module 2's parsing logic.

const SAMPLE_QUERY = "motor accident compensation Section 166 Motor Vehicles Act";
const DOCTYPES = "supremecourt,highcourts";

async function main() {
  if (!config.indianKanoonToken) {
    throw new Error(
      "INDIAN_KANOON_API_TOKEN is not set in .env. Add your real token before running this script."
    );
  }

  const params = new URLSearchParams({
    formInput: SAMPLE_QUERY,
    pagenum: "0",
    doctypes: DOCTYPES,
  });
  const url = `https://api.indiankanoon.org/search/?${params.toString()}`;

  logger.info(`POST ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${config.indianKanoonToken}`,
      Accept: "application/json",
    },
  });

  logger.info(`Status: ${response.status} ${response.statusText}`);

  const rawText = await response.text();

  if (!response.ok) {
    logger.error(`Request failed. Raw body:\n${rawText}`);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    logger.error(`Response was not valid JSON: ${err.message}`);
    console.log(rawText);
    process.exit(1);
  }

  console.log("=== FULL RAW RESPONSE ===");
  console.log(JSON.stringify(parsed, null, 2));

  console.log("\n=== SHAPE SUMMARY ===");
  console.log(`Top-level keys: ${Object.keys(parsed).join(", ")}`);
  if (Array.isArray(parsed.docs)) {
    console.log(`docs[] length: ${parsed.docs.length}`);
    if (parsed.docs[0]) {
      console.log(`docs[0] keys: ${Object.keys(parsed.docs[0]).join(", ")}`);
    }
  }
}

main().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});

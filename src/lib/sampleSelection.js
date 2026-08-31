/**
 * Lets a test script run against just one sample case instead of all of
 * them, to work within the Gemini free-tier daily quota. Pick a sample via
 * either a CLI argument or the SAMPLE_INDEX env var (1-based); omit both to
 * run every sample, same as before.
 *
 *   node scripts/test-summarizer.js 2       (sample 2 only)
 *   SAMPLE_INDEX=3 node scripts/test-synthesis.js   (sample 3 only)
 */
export function selectSamples(allDescriptions) {
  const raw = process.argv[2] ?? process.env.SAMPLE_INDEX;

  if (!raw) {
    return allDescriptions.map((description, i) => ({ description, index: i }));
  }

  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > allDescriptions.length) {
    throw new Error(
      `Invalid sample index "${raw}". Pass a number from 1 to ${allDescriptions.length} ` +
        `(as a CLI argument or the SAMPLE_INDEX env var), or omit it to run all samples.`
    );
  }

  return [{ description: allDescriptions[n - 1], index: n - 1 }];
}

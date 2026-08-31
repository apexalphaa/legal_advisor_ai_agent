// Formats a pipeline result into one or more Telegram-ready message strings.
// Uses legacy Telegram "Markdown" (not MarkdownV2) — far fewer characters
// need escaping, and free-form LLM/legal text is unpredictable enough that
// MarkdownV2's strict escaping requirements would be a real breakage risk.

// Comfortable margin under Telegram's actual 4096-character limit.
const MAX_MESSAGE_LENGTH = 4000;

/** Escapes the handful of characters that matter in legacy Markdown mode. */
export function escapeMarkdown(text = "") {
  return String(text).replace(/([_*`[])/g, "\\$1");
}

function splitLongBlock(block) {
  const paragraphs = block.split("\n\n");
  const pieces = [];
  let buffer = "";

  for (const para of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${para}` : para;
    if (candidate.length > MAX_MESSAGE_LENGTH) {
      if (buffer) {
        pieces.push(buffer);
        buffer = "";
      }
      if (para.length > MAX_MESSAGE_LENGTH) {
        // A single paragraph longer than the limit (rare) is hard-wrapped
        // into multiple full-length pieces — never truncated/dropped.
        for (let i = 0; i < para.length; i += MAX_MESSAGE_LENGTH) {
          pieces.push(para.slice(i, i + MAX_MESSAGE_LENGTH));
        }
      } else {
        buffer = para;
      }
    } else {
      buffer = candidate;
    }
  }
  if (buffer) pieces.push(buffer);
  return pieces;
}

function packBlocksIntoMessages(blocks) {
  const messages = [];
  let current = "";

  for (const block of blocks) {
    const pieces = block.length > MAX_MESSAGE_LENGTH ? splitLongBlock(block) : [block];

    for (const piece of pieces) {
      const candidate = current ? `${current}\n\n${piece}` : piece;
      if (candidate.length > MAX_MESSAGE_LENGTH) {
        if (current) messages.push(current);
        current = piece;
      } else {
        current = candidate;
      }
    }
  }

  if (current) messages.push(current);
  return messages;
}

/**
 * Builds the sequence of Telegram messages for one pipeline result: an
 * intro (enhanced query), one block per case summary, the overall
 * synthesis, and a closing disclaimer — packed into as few messages as fit
 * under Telegram's length limit.
 */
export function buildTelegramMessages(result) {
  const blocks = [];
  const enhanced = result.enhancedQuery;

  blocks.push(
    `🔎 *Case Research Results*\n\n` +
      `*Category:* ${escapeMarkdown(enhanced.category)}\n` +
      `*Key facts:* ${escapeMarkdown(enhanced.keyFacts)}`
  );

  result.caseSummaries.forEach((c, i) => {
    const scoreText = typeof c.relevanceScore === "number" ? `${c.relevanceScore}/10` : "n/a";
    blocks.push(
      `📄 *Case ${i + 1}: ${escapeMarkdown(c.title)}*\n` +
        `*Court:* ${escapeMarkdown(c.court ?? "Unknown")} | *Date:* ${escapeMarkdown(c.date ?? "Unknown")} | *Relevance:* ${scoreText}\n\n` +
        `${escapeMarkdown(c.relevanceAnalysis)}\n\n` +
        `🔗 ${c.sourceUrl}`
    );
  });

  const synth = result.synthesis;
  let synthesisBlock =
    `🧩 *Overall Synthesis*\n\n` +
    `*Common patterns:*\n${escapeMarkdown(synth.commonPatterns)}\n\n` +
    `*Divergence:*\n${escapeMarkdown(synth.divergence || "None noted.")}\n\n` +
    `*Relevance to your situation:*\n${escapeMarkdown(synth.relevanceToUserCase)}`;

  if (synth.weakEvidenceNote) {
    synthesisBlock += `\n\n*Evidence quality note:*\n${escapeMarkdown(synth.weakEvidenceNote)}`;
  }
  blocks.push(synthesisBlock);

  if (Array.isArray(synth.sources) && synth.sources.length > 0) {
    blocks.push(`*Sources:*\n${synth.sources.map((u) => `🔗 ${u}`).join("\n")}`);
  }

  blocks.push(`⚠️ ${escapeMarkdown(synth.disclaimer)}`);

  return packBlocksIntoMessages(blocks);
}

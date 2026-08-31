import TelegramBot from "node-telegram-bot-api";
import { buildTelegramMessages } from "./lib/telegramFormat.js";
import * as logger from "./lib/logger.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = Number(process.env.PORT) || 3000;
const API_BASE_URL = `http://localhost:${PORT}`;

// Below this length, treat the message as too short to be a real case
// description (e.g. "hi", "test") rather than running a pipeline on it.
const MIN_DESCRIPTION_LENGTH = 20;
const MESSAGE_SEND_DELAY_MS = 300;

if (!TOKEN) {
  logger.error(
    "TELEGRAM_BOT_TOKEN is not set. Add it to .env — see the setup checklist for how to get one from @BotFather."
  );
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

logger.info(`Telegram bot started, polling for messages. Will call the API at ${API_BASE_URL}`);

bot.on("polling_error", (err) => {
  logger.error(`[bot] polling error: ${err.message}`);
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Sends a Markdown-formatted message; falls back to plain text if Telegram rejects the formatting. */
async function sendFormatted(chatId, text) {
  try {
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  } catch (err) {
    logger.warn(`[bot] chat=${chatId} formatted send failed (${err.message}); retrying as plain text.`);
    try {
      await bot.sendMessage(chatId, text.replace(/[*_`]/g, ""));
    } catch (err2) {
      logger.error(`[bot] chat=${chatId} plain-text retry also failed: ${err2.message}`);
    }
  }
}

async function callCaseApi(description) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/case`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
  } catch (err) {
    throw new Error(
      `Could not reach the API at ${API_BASE_URL} (${err.message}). Is "npm run start:api" running?`
    );
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `API responded with status ${response.status}`);
  }
  return body;
}

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text ?? "").trim();

  try {
    if (!text) return; // ignore non-text messages (photos, stickers, etc.)

    if (text === "/start") {
      await bot.sendMessage(
        chatId,
        "Hi! Describe your legal situation in plain language — what happened, who was involved, roughly " +
          "when/where — and I'll research similar Indian Supreme Court / High Court cases for you.\n\n" +
          "This is legal research assistance, not legal advice."
      );
      return;
    }

    if (text.length < MIN_DESCRIPTION_LENGTH) {
      await bot.sendMessage(
        chatId,
        "Could you describe your situation in a bit more detail? For example: what happened, who was " +
          "involved, and roughly when/where. That's a bit short for me to search for similar cases."
      );
      return;
    }

    logger.info(`[bot] chat=${chatId} received case description (${text.length} chars)`);
    await bot.sendMessage(chatId, "🔍 Researching similar cases, this may take a minute or two...");

    let result;
    try {
      result = await callCaseApi(text);
    } catch (err) {
      logger.error(`[bot] chat=${chatId} API call failed: ${err.message}`);
      await bot.sendMessage(
        chatId,
        "Sorry, something went wrong while researching your case. The research service may be " +
          "temporarily unavailable — please try again in a moment."
      );
      return;
    }

    logger.info(`[bot] chat=${chatId} API call succeeded, sending formatted result`);
    const messages = buildTelegramMessages(result);
    for (const message of messages) {
      await sendFormatted(chatId, message);
      await sleep(MESSAGE_SEND_DELAY_MS);
    }
  } catch (err) {
    // Last-resort guard so a bug here never leaves the user without any reply.
    logger.error(`[bot] chat=${chatId} unexpected error: ${err.stack || err.message}`);
    await bot.sendMessage(chatId, "Something unexpected went wrong on my end. Please try again.").catch(() => {});
  }
});

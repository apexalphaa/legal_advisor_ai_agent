// Base URL of the existing Express API (Phase B). Override via a .env file
// in this folder with VITE_API_URL=... if it's ever not on localhost:3000.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Calls POST /api/case with the user's description and returns the parsed
 * pipeline result. Throws an Error with a user-facing message on any
 * failure (network error, non-2xx response, malformed body) — deliberately
 * no client-side timeout, since a full pipeline run can legitimately take
 * up to several minutes (the API's own server-side timeout is the real limit).
 */
export async function runCaseResearch(description) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/case`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
  } catch (err) {
    throw new Error(
      `Could not reach the research API at ${API_BASE_URL}. Is the server running (npm run start:api)?`
    );
  }

  let body;
  try {
    body = await response.json();
  } catch (err) {
    throw new Error("The API returned a response that wasn't valid JSON.");
  }

  if (!response.ok) {
    throw new Error(body?.error || `API responded with status ${response.status}.`);
  }

  return body;
}

// In production the React app and Express API are served by the same
// Vercel project, so use a relative /api URL. In local Vite development,
// keep using the local Express server on port 3000 unless VITE_API_URL
// explicitly overrides it.
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3000" : "");

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
      `Could not reach the research API at ${
        API_BASE_URL || window.location.origin
      }.`
    );
  }

  let body;

  try {
    body = await response.json();
  } catch (err) {
    throw new Error("The API returned a response that wasn't valid JSON.");
  }

  if (!response.ok) {
    throw new Error(
      body?.error || `API responded with status ${response.status}.`
    );
  }

  return body;
}

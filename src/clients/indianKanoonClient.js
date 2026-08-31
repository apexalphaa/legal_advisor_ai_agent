import { config, assertKanoonConfigured } from "../config.js";

const BASE_URL = "https://api.indiankanoon.org";

/**
 * Low-level POST request to the Indian Kanoon API.
 * Endpoint-specific helpers (search, get document, etc.) are built on top of this
 * in the case-search and document-fetcher modules.
 *
 * @param {string} path - e.g. "/search/?formInput=...&pagenum=0"
 * @param {object} [opts]
 * @param {any} [opts.mockResponse] - if INDIAN_KANOON_MOCK=true, this is returned instead of calling the API
 * @returns {Promise<any>} parsed JSON response
 */
export async function kanoonRequest(path, { mockResponse } = {}) {
  if (config.indianKanoonMock) {
    if (mockResponse === undefined) {
      throw new Error(
        `INDIAN_KANOON_MOCK=true but no mockResponse was provided for request to ${path}`
      );
    }
    return mockResponse;
  }

  assertKanoonConfigured();

  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${config.indianKanoonToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Indian Kanoon API request failed: ${response.status} ${response.statusText}\n${body}`
    );
  }

  return response.json();
}

/**
 * Calls POST /search/.
 *
 * IMPORTANT: confirmed via live testing that Indian Kanoon's `doctypes`
 * court-type filter does NOT work as a separate query parameter (contrary to
 * the published docs) — it only takes effect when embedded directly inside
 * `formInput` itself, e.g. `"<query text> doctypes:supremecourt,highcourts"`.
 * Callers (see caseSearch.js) are expected to build `formInput` that way
 * already; this function does not add any filter on its own.
 *
 * We also avoid `URLSearchParams` here: it would percent-encode the `:` and
 * `,` inside the embedded doctypes directive (e.g. `%3A`, `%2C`), and given
 * how undocumented/inconsistent this endpoint already is, it's safer to
 * match the literal format Indian Kanoon's own UI generates (spaces encoded,
 * colons/commas left as-is) rather than assume standards-compliant decoding.
 */
export async function searchDocuments({ formInput, pagenum = 0, mockResponse } = {}) {
  const encodedQuery = encodeURIComponent(formInput)
    .replace(/%20/g, "+")
    .replace(/%3A/g, ":")
    .replace(/%2C/g, ",");
  const path = `/search/?formInput=${encodedQuery}&pagenum=${pagenum}`;
  return kanoonRequest(path, { mockResponse });
}

/**
 * Calls POST /doc/<tid>/ to fetch the full judgment text.
 *
 * NOTE: compared against /origdoc/<tid>/ (retrieves the original court copy)
 * on two real documents before choosing this as the default. /origdoc/
 * returns a base64-encoded blob whose Content-Type varies per document (seen:
 * "application/pdf" for one, "text/html" wrapping a scanned-image viewer page
 * for another) — neither is usable as text without OCR/PDF parsing. /doc/
 * returns clean(er) semantic HTML (`<h2 class="doc_title">`, a `<pre>` block
 * with the actual judgment body) that's straightforward to strip down to
 * plain text. So /doc/ is what documentFetcher.js (Module 3) uses.
 */
export async function getDocument(tid, { mockResponse } = {}) {
  const path = `/doc/${tid}/`;
  return kanoonRequest(path, { mockResponse });
}

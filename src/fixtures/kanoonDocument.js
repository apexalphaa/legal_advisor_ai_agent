// Mock /doc/<tid>/ response for INDIAN_KANOON_MOCK=true, matching the real
// field shape confirmed via live testing: { tid, publishdate, title, doc
// (semantic HTML with a doc_title/doc_author/doc_bench header and a <pre>
// body), numcites, numcitedby, docsource }.
export function getMockDocument(tid) {
  const title = `Mock Judgment ${tid}`;
  return {
    tid,
    publishdate: "2020-01-01",
    title,
    doc: `<h2 class="doc_title">${title}</h2>
<h3 class="doc_author">Author: <a href="#">Mock J.</a></h3>
<h3 class="doc_bench">Bench: <a href="#">Mock J.</a></h3>
<pre id="pre_1">
This is placeholder full judgment text for mock tid ${tid}, used only when
INDIAN_KANOON_MOCK=true. It stands in for the real judgment body so the
Module 1 -> 2 -> 3 pipeline can be exercised end-to-end without live API
calls or per-page billing.

1. Facts of the case would appear here.
2. The legal issue before the court would appear here.
3. The court's reasoning and decision would appear here.
</pre>`,
    numcites: 5,
    numcitedby: 2,
    docsource: "Mock High Court",
  };
}

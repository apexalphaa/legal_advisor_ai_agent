// Thresholds mirror the backend's own scoring rubric (see caseSearch.js /
// summarizer.js system prompts): 9-10 direct match, 6-8 clearly related
// (both "green"), 3-5 tangential ("amber"), 0-2 unrelated ("red").
function bandFor(score) {
  if (typeof score !== "number") return { label: "n/a", className: "badge-neutral" };
  if (score >= 6) return { label: `${score}/10`, className: "badge-green" };
  if (score >= 3) return { label: `${score}/10`, className: "badge-amber" };
  return { label: `${score}/10`, className: "badge-red" };
}

export default function RelevanceBadge({ score }) {
  const { label, className } = bandFor(score);
  return <span className={`badge ${className}`}>{label}</span>;
}

/** Same weak/strong signal the backend uses internally for Module 5's synthesis prompt, recomputed here since it isn't exposed in the API response. */
export function isEvidenceWeak(caseSummaries) {
  const scored = caseSummaries.filter((c) => typeof c.relevanceScore === "number");
  if (scored.length === 0) return true;
  const weakCount = scored.filter((c) => c.relevanceScore < 6).length;
  return weakCount / scored.length >= 0.5;
}

import RelevanceBadge, { isEvidenceWeak } from "./RelevanceBadge.jsx";

function EnhancedQuerySummary({ enhancedQuery }) {
  return (
    <section className="panel">
      <h2>What we searched for</h2>
      <dl className="summary-grid">
        <dt>Category</dt>
        <dd>{enhancedQuery.category}</dd>
        <dt>Key facts</dt>
        <dd>{enhancedQuery.keyFacts}</dd>
        {enhancedQuery.jurisdiction && (
          <>
            <dt>Jurisdiction</dt>
            <dd>{enhancedQuery.jurisdiction}</dd>
          </>
        )}
        {enhancedQuery.relevantSections?.length > 0 && (
          <>
            <dt>Relevant sections/acts</dt>
            <dd>{enhancedQuery.relevantSections.join(", ")}</dd>
          </>
        )}
      </dl>
    </section>
  );
}

function CaseCard({ caseSummary, index }) {
  return (
    <article className="case-card">
      <header className="case-card-header">
        <span className="case-number">#{index + 1}</span>
        <h3>{caseSummary.title}</h3>
        <RelevanceBadge score={caseSummary.relevanceScore} />
      </header>
      <p className="case-meta">
        {caseSummary.court} {caseSummary.date ? `· ${caseSummary.date}` : ""}
      </p>
      <p className="case-finding">{caseSummary.relevanceAnalysis}</p>
      <a className="case-source-link" href={caseSummary.sourceUrl} target="_blank" rel="noopener noreferrer">
        View full judgment on Indian Kanoon ↗
      </a>
    </article>
  );
}

function SynthesisSection({ synthesis, weak }) {
  return (
    <section className="panel">
      <h2>Overall synthesis</h2>
      <h4>Common patterns</h4>
      <p>{synthesis.commonPatterns}</p>
      <h4>Divergence between cases</h4>
      <p>{synthesis.divergence || "None noted."}</p>
      <h4>Relevance to your situation</h4>
      <p>{synthesis.relevanceToUserCase}</p>
      {synthesis.weakEvidenceNote && (
        <div className={weak ? "evidence-note evidence-note-weak" : "evidence-note"}>
          <strong>{weak ? "⚠ Limited evidence: " : "Evidence quality: "}</strong>
          {synthesis.weakEvidenceNote}
        </div>
      )}
    </section>
  );
}

export default function ResultsView({ result, onNewSearch }) {
  const weak = isEvidenceWeak(result.caseSummaries);

  return (
    <div className="results-view">
      <div className="results-header">
        <h1>Case Research Results</h1>
        <button onClick={onNewSearch}>New search</button>
      </div>

      <div className="disclaimer-banner">{result.synthesis.disclaimer}</div>

      <EnhancedQuerySummary enhancedQuery={result.enhancedQuery} />

      <section className="panel">
        <h2>Similar cases found ({result.caseSummaries.length})</h2>
        {result.caseSummaries.length === 0 ? (
          <p>No sufficiently relevant cases were found for this search.</p>
        ) : (
          <div className="case-list">
            {result.caseSummaries.map((c, i) => (
              <CaseCard key={c.tid ?? i} caseSummary={c} index={i} />
            ))}
          </div>
        )}
      </section>

      <SynthesisSection synthesis={result.synthesis} weak={weak} />

      <div className="disclaimer-banner">{result.synthesis.disclaimer}</div>
    </div>
  );
}

export default function LoadingState() {
  return (
    <div className="loading-state">
      <div className="spinner" aria-hidden="true" />
      <p>Researching similar cases — this can take 30–90+ seconds, sometimes longer for complex cases.</p>
      <p className="loading-substep">Enhancing your query, searching Indian Kanoon, fetching and summarizing judgments...</p>
    </div>
  );
}

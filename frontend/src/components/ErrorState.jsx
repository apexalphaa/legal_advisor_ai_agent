export default function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <h2>Something went wrong</h2>
      <p>{message}</p>
      <button onClick={onRetry}>Try again</button>
    </div>
  );
}

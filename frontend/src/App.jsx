import { useState } from "react";
import { runCaseResearch } from "./api.js";
import CaseInputForm from "./components/CaseInputForm.jsx";
import LoadingState from "./components/LoadingState.jsx";
import ErrorState from "./components/ErrorState.jsx";
import ResultsView from "./components/ResultsView.jsx";
import "./App.css";

// view: "input" | "loading" | "results" | "error"
export default function App() {
  const [view, setView] = useState("input");
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(description) {
    setView("loading");
    try {
      const data = await runCaseResearch(description);
      setResult(data);
      setView("results");
    } catch (err) {
      setErrorMessage(err.message);
      setView("error");
    }
  }

  function handleReset() {
    setResult(null);
    setErrorMessage("");
    setView("input");
  }

  return (
    <main className="app-container">
      <h1 className="app-title">Indian Case Law Research Assistant</h1>

      {view === "input" && <CaseInputForm onSubmit={handleSubmit} />}
      {view === "loading" && <LoadingState />}
      {view === "error" && <ErrorState message={errorMessage} onRetry={handleReset} />}
      {view === "results" && result && <ResultsView result={result} onNewSearch={handleReset} />}
    </main>
  );
}

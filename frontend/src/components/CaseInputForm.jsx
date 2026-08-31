import { useState } from "react";

const MIN_LENGTH = 20;

export default function CaseInputForm({ onSubmit }) {
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);

  const tooShort = description.trim().length < MIN_LENGTH;

  function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (tooShort) return;
    onSubmit(description.trim());
  }

  return (
    <form className="case-form" onSubmit={handleSubmit}>
      <label htmlFor="description">Describe your legal situation</label>
      <textarea
        id="description"
        rows={6}
        placeholder="e.g. My neighbor's construction work damaged the boundary wall of my property and they refuse to pay for repairs."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {touched && tooShort && (
        <p className="field-hint">
          Please add a bit more detail (what happened, who was involved, roughly when/where) — that's too short to
          search for similar cases.
        </p>
      )}
      <button type="submit" disabled={tooShort}>
        Research similar cases
      </button>
    </form>
  );
}

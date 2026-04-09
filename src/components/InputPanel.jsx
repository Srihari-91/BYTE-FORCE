import React, { useState } from 'react';
import { MODEL_PRICING, EXAMPLE_PROMPTS } from '../utils/tokenizer';

export default function InputPanel({
  prompt,
  setPrompt,
  model,
  setModel,
  onAnalyze,
  loading,
}) {
  const charCount = prompt.length;

  const handleExampleClick = (text) => {
    setPrompt(text);
  };

  return (
    <section className="panel glass-panel input-panel" aria-label="Prompt input">
      <div className="panel-header">
        <h2 className="panel-title">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Input Prompt
        </h2>

        <div className="controls-row">
          <div className="select-wrapper" title="Select the LLM model for cost calculation">
            <svg
              className="select-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            <select
              id="model-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              aria-label="Select LLM model"
            >
              {Object.entries(MODEL_PRICING).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.name}
                </option>
              ))}
            </select>
            <svg
              className="select-chevron"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <div className="token-counter" title="Live character count">
            {charCount.toLocaleString()} chars
          </div>

          <button
            id="analyze-btn"
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
            onClick={onAnalyze}
            disabled={loading || !prompt.trim()}
            aria-live="polite"
          >
            {loading ? (
              <span className="btn-loading">
                <svg
                  className="spin-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Analyzing…
              </span>
            ) : (
              <span className="btn-text">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                Analyze Tokens
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Pricing Bar */}
      <div className="pricing-bar" role="status" aria-live="polite">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>
          {MODEL_PRICING[model]?.name} — Input: ${MODEL_PRICING[model]?.input.toFixed(2)} / 1M
          tokens · Output: ${MODEL_PRICING[model]?.output.toFixed(2)} / 1M tokens
        </span>
      </div>

      <div className="textarea-wrapper">
        <textarea
          id="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Paste or type your prompt here…&#10;&#10;Example: Could you please kindly help me write a very detailed Python script that basically does image classification using a neural network?"
          rows={12}
          aria-label="LLM prompt input"
          spellCheck="true"
        />
      </div>

      <div className="example-chips" role="group" aria-label="Example prompts">
        <span className="chips-label">Try:</span>
        {EXAMPLE_PROMPTS.map((ex) => (
          <button
            key={ex.label}
            className="chip"
            onClick={() => handleExampleClick(ex.text)}
          >
            {ex.label}
          </button>
        ))}
      </div>
    </section>
  );
}

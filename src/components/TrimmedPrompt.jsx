import React, { useState } from 'react';

export default function TrimmedPrompt({ original, trimmed }) {
  const [copied, setCopied] = useState(false);

  if (!trimmed) {
    return (
      <section className="panel glass-panel trimmed-panel" aria-label="Trimmed prompt output">
        <div className="panel-header">
          <h2 className="panel-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8.56 2.9A7 7 0 0 1 19 9v4" />
              <path d="M5 12v-1a7 7 0 0 1 .24-1.83" />
              <path d="M2 20l2-2 2 2-2 2z" />
              <path d="M22 20l-2-2-2 2 2 2z" />
              <path d="M5.5 18.5L2 22" />
              <path d="M18.5 18.5L22 22" />
            </svg>
            Smart Trimmed Prompt
          </h2>
        </div>
        <p className="placeholder-text">Run analysis to see the optimized prompt…</p>
      </section>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(trimmed).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  return (
    <section className="panel glass-panel trimmed-panel" aria-label="Trimmed prompt output">
      <div className="panel-header">
        <h2 className="panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8.56 2.9A7 7 0 0 1 19 9v4" />
            <path d="M5 12v-1a7 7 0 0 1 .24-1.83" />
            <path d="M2 20l2-2 2 2-2 2z" />
            <path d="M22 20l-2-2-2 2 2 2z" />
            <path d="M5.5 18.5L2 22" />
            <path d="M18.5 18.5L22 22" />
          </svg>
          Smart Trimmed Prompt
        </h2>
        <div className="trim-actions">
          <button
            className={`btn btn-secondary ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            aria-label="Copy trimmed prompt to clipboard"
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      <div className="trim-comparison animate-fade-up">
        <div className="comparison-col">
          <div className="comparison-label original-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Original
          </div>
          <div className="comparison-text">{original}</div>
        </div>

        <div className="comparison-divider" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        <div className="comparison-col">
          <div className="comparison-label trimmed-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Trimmed
          </div>
          <div className="comparison-text trimmed">{trimmed}</div>
        </div>
      </div>
    </section>
  );
}

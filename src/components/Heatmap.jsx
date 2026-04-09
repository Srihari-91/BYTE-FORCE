import React, { useState } from 'react';
import { getTokenCategory } from '../utils/tokenizer';

function scoreToColor(score) {
  const stops = [
    [0.0, [55, 65, 81, 0.5]],
    [0.15, [55, 65, 81, 0.6]],
    [0.3, [234, 179, 8, 0.55]],
    [0.6, [249, 115, 22, 0.72]],
    [1.0, [239, 68, 68, 0.88]],
  ];

  const s = Math.max(0, Math.min(1, score));

  for (let i = 1; i < stops.length; i++) {
    const [s0, c0] = stops[i - 1];
    const [s1, c1] = stops[i];

    if (s <= s1) {
      const t = (s - s0) / (s1 - s0);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * t);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * t);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * t);
      const a = +(c0[3] + (c1[3] - c0[3]) * t).toFixed(3);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }

  return 'rgba(239, 68, 68, 0.88)';
}

function getCategoryClass(label) {
  switch (label) {
    case 'Critical': return 'status-critical';
    case 'Important': return 'status-important';
    case 'Context': return 'status-context';
    default: return 'status-noise';
  }
}

export default function Heatmap({ tokenData }) {
  const [tooltip, setTooltip] = useState(null);

  if (!tokenData || tokenData.length === 0) {
    return (
      <section className="panel glass-panel heatmap-panel" aria-label="Token importance heatmap">
        <div className="panel-header">
          <h2 className="panel-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            Token Importance Heatmap
          </h2>
          <div className="heatmap-legend" role="img" aria-label="Heatmap color legend">
            <div className="legend-gradient"></div>
            <div className="legend-labels">
              <span>Noise</span>
              <span>Context</span>
              <span>Important</span>
              <span>Critical</span>
            </div>
          </div>
        </div>
        <div className="heatmap-container" role="region" aria-live="polite">
          <p className="placeholder-text">Run analysis to see the token heatmap…</p>
        </div>
      </section>
    );
  }

  const handleMouseEnter = (e, token) => {
    const category = getTokenCategory(token.score);
    setTooltip({
      token: token.text,
      score: token.score,
      category: category.label,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleMouseMove = (e) => {
    if (tooltip) {
      setTooltip((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
    }
  };

  return (
    <section className="panel glass-panel heatmap-panel" aria-label="Token importance heatmap">
      <div className="panel-header">
        <h2 className="panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
          Token Importance Heatmap
        </h2>
        <div className="heatmap-legend" role="img" aria-label="Heatmap color legend">
          <div className="legend-gradient"></div>
          <div className="legend-labels">
            <span>Noise</span>
            <span>Context</span>
            <span>Important</span>
            <span>Critical</span>
          </div>
        </div>
      </div>

      <div className="heatmap-container" role="region" aria-live="polite">
        {tokenData.map((token, idx) => {
          const bgColor = scoreToColor(token.score);
          const textColor = token.score < 0.15 ? '#4b5563' : '#ffffff';
          const category = getTokenCategory(token.score);

          return (
            <span
              key={idx}
              className="token-span"
              style={{ backgroundColor: bgColor, color: textColor }}
              onMouseEnter={(e) => handleMouseEnter(e, token)}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setTooltip(null)}
              title={`${category.label}: ${(token.score * 100).toFixed(0)}%`}
            >
              {token.text}
            </span>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="token-tooltip visible"
          style={{
            position: 'fixed',
            left: tooltip.x + 14,
            top: tooltip.y + 14,
            zIndex: 1000,
          }}
        >
          <div className="tooltip-token">"{token.text.replace(/\n/g, '↵')}"</div>
          <div className="tooltip-score">
            <div className="tooltip-label">Importance</div>
            <div className="tooltip-bar-wrap">
              <div
                className="tooltip-bar"
                style={{ width: `${Math.round(tooltip.score * 100)}%` }}
              />
            </div>
            <div className="tooltip-pct">{Math.round(tooltip.score * 100)}%</div>
          </div>
          <div className={`tooltip-status ${getCategoryClass(tooltip.category)}`}>
            {tooltip.category}
          </div>
        </div>
      )}
    </section>
  );
}

import React from 'react';
import { formatUSD, MODEL_PRICING } from '../utils/tokenizer';

export default function StatsRow({ stats }) {
  if (!stats) return null;

  const { original_tokens, trimmed_tokens, cost_original_usd, cost_trimmed_usd, model, savings_percentage } =
    stats;

  const savedTokens = original_tokens - trimmed_tokens;
  const moneySaved = cost_original_usd - cost_trimmed_usd;
  const modelName = MODEL_PRICING[model]?.name || model;

  return (
    <section className="stats-row" aria-label="Analysis statistics">
      <div className="stat-card glass-panel">
        <div className="stat-icon stat-icon-blue">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div className="stat-info">
          <div className="stat-label">Original Cost</div>
          <div className="stat-value">{formatUSD(cost_original_usd)}</div>
          <div className="stat-sub">{original_tokens.toLocaleString()} tokens</div>
        </div>
      </div>

      <div className="stat-card glass-panel stat-card-accent">
        <div className="stat-icon stat-icon-violet">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div className="stat-info">
          <div className="stat-label">Trimmed Cost</div>
          <div className="stat-value">{formatUSD(cost_trimmed_usd)}</div>
          <div className="stat-sub">{trimmed_tokens.toLocaleString()} tokens</div>
        </div>
      </div>

      <div className="stat-card glass-panel stat-card-success">
        <div className="stat-icon stat-icon-green">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        </div>
        <div className="stat-info">
          <div className="stat-label">Tokens Saved</div>
          <div className="stat-value stat-value-green">{savings_percentage?.toFixed(1)}%</div>
          <div className="stat-sub">{savedTokens.toLocaleString()} tokens saved</div>
        </div>
      </div>

      <div className="stat-card glass-panel">
        <div className="stat-icon stat-icon-orange">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </div>
        <div className="stat-info">
          <div className="stat-label">Model</div>
          <div className="stat-value stat-value-model">{modelName}</div>
          <div className="stat-sub">{formatUSD(moneySaved)} saved</div>
        </div>
      </div>
    </section>
  );
}

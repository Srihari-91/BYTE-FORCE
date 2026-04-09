import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { formatUSD } from '../utils/tokenizer';

export default function HistoryChart({ history }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || history.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');

    const labels = history.map((_, i) => `Query ${i + 1}`);
    const origData = history.map((h) => h.original_tokens);
    const trimData = history.map((h) => h.trimmed_tokens);
    const cumulativeSavings = history.map((_, i) => {
      let total = 0;
      for (let j = 0; j <= i; j++) {
        total += history[j].original_tokens - history[j].trimmed_tokens;
      }
      return total;
    });

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Original Tokens',
            data: origData,
            borderColor: 'rgba(99, 102, 241, 1)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8,
          },
          {
            label: 'Trimmed Tokens',
            data: trimData,
            borderColor: 'rgba(16, 185, 129, 1)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8,
          },
          {
            label: 'Cumulative Savings',
            data: cumulativeSavings,
            borderColor: 'rgba(245, 158, 11, 1)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8,
            borderDash: [5, 5],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#94a3b8', usePointStyle: true },
          },
          tooltip: {
            backgroundColor: '#1a1d2e',
            borderColor: 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            titleColor: '#e2e8f0',
            bodyColor: '#94a3b8',
            padding: 12,
            cornerRadius: 10,
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#64748b' },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: '#64748b',
              callback: (v) => v.toLocaleString(),
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [history]);

  const totalOriginal = history.reduce((sum, h) => sum + h.original_tokens, 0);
  const totalTrimmed = history.reduce((sum, h) => sum + h.trimmed_tokens, 0);
  const totalSaved = totalOriginal - totalTrimmed;
  const avgSavings = history.length > 0
    ? history.reduce((sum, h) => sum + h.savings_percentage, 0) / history.length
    : 0;

  return (
    <section className="panel glass-panel history-panel" aria-label="Token usage history">
      <div className="panel-header">
        <h2 className="panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-4" />
          </svg>
          📊 Session History
        </h2>
        <span className="panel-subtitle">{history.length} queries analyzed</span>
      </div>

      {history.length === 0 ? (
        <div className="history-placeholder">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-4" />
          </svg>
          <p>Analyze prompts to build your session history…</p>
        </div>
      ) : (
        <>
          {/* Session Stats */}
          <div className="history-stats">
            <div className="hist-stat">
              <span className="hist-stat-label">Total Original</span>
              <span className="hist-stat-value">{totalOriginal.toLocaleString()}</span>
            </div>
            <div className="hist-stat">
              <span className="hist-stat-label">Total Trimmed</span>
              <span className="hist-stat-value">{totalTrimmed.toLocaleString()}</span>
            </div>
            <div className="hist-stat highlight">
              <span className="hist-stat-label">Total Saved</span>
              <span className="hist-stat-value">{totalSaved.toLocaleString()}</span>
            </div>
            <div className="hist-stat">
              <span className="hist-stat-label">Avg Savings</span>
              <span className="hist-stat-value">{avgSavings.toFixed(1)}%</span>
            </div>
          </div>

          {/* Chart */}
          <div className="chart-wrapper history-chart">
            <canvas ref={canvasRef} />
          </div>

          {/* History Table */}
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Prompt Preview</th>
                  <th>Model</th>
                  <th>Original</th>
                  <th>Trimmed</th>
                  <th>Saved</th>
                  <th>Savings %</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td className="prompt-preview">{item.prompt.slice(0, 50)}…</td>
                    <td>{item.model}</td>
                    <td>{item.original_tokens.toLocaleString()}</td>
                    <td>{item.trimmed_tokens.toLocaleString()}</td>
                    <td className="highlight">{(item.original_tokens - item.trimmed_tokens).toLocaleString()}</td>
                    <td>{item.savings_percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

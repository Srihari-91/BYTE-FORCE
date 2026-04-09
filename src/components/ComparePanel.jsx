import React, { useState, useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';
import {
  countTokens,
  trimPrompt,
  calculateCost,
  computeTokenScores,
  getTokenDistribution,
  formatUSD,
  MODEL_PRICING,
} from '../utils/tokenizer';

export default function ComparePanel() {
  const [promptA, setPromptA] = useState('');
  const [promptB, setPromptB] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [results, setResults] = useState(null);
  const chartRef = useRef(null);
  const canvasRef = useRef(null);

  const handleCompare = () => {
    if (!promptA.trim() || !promptB.trim()) return;

    const pricing = MODEL_PRICING[model];
    const inputPrice = pricing.input;

    // Analyze Prompt A
    const origA = countTokens(promptA);
    const trimmedA = trimPrompt(promptA);
    const trimA = countTokens(trimmedA);
    const costOrigA = calculateCost(origA, inputPrice);
    const costTrimA = calculateCost(trimA, inputPrice);
    const savingsA = origA > 0 ? ((origA - trimA) / origA) * 100 : 0;
    const distA = getTokenDistribution(computeTokenScores(promptA));

    // Analyze Prompt B
    const origB = countTokens(promptB);
    const trimmedB = trimPrompt(promptB);
    const trimB = countTokens(trimmedB);
    const costOrigB = calculateCost(origB, inputPrice);
    const costTrimB = calculateCost(trimB, inputPrice);
    const savingsB = origB > 0 ? ((origB - trimB) / origB) * 100 : 0;
    const distB = getTokenDistribution(computeTokenScores(promptB));

    setResults({
      a: {
        original: origA,
        trimmed: trimA,
        trimmedText: trimmedA,
        costOrig: costOrigA,
        costTrim: costTrimA,
        savings: savingsA,
        distribution: distA,
      },
      b: {
        original: origB,
        trimmed: trimB,
        trimmedText: trimmedB,
        costOrig: costOrigB,
        costTrim: costTrimB,
        savings: savingsB,
        distribution: distB,
      },
      winner: costTrimA < costTrimB ? 'A' : 'B',
    });
  };

  // Render chart when results change
  useEffect(() => {
    if (!results || !canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Prompt A', 'Prompt B'],
        datasets: [
          {
            label: 'Original Tokens',
            data: [results.a.original, results.b.original],
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 2,
            borderRadius: 8,
          },
          {
            label: 'Trimmed Tokens',
            data: [results.a.trimmed, results.b.trimmed],
            backgroundColor: 'rgba(16, 185, 129, 0.7)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 2,
            borderRadius: 8,
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
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#64748b' },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#64748b' },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [results]);

  return (
    <section className="panel glass-panel compare-panel" aria-label="Compare prompts">
      <div className="panel-header">
        <h2 className="panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          ⚖️ Compare 2 Prompts
        </h2>
        <div className="controls-row">
          <select value={model} onChange={(e) => setModel(e.target.value)} className="model-select-small">
            {Object.entries(MODEL_PRICING).map(([key, val]) => (
              <option key={key} value={key}>
                {val.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={handleCompare}
            disabled={!promptA.trim() || !promptB.trim()}
          >
            Compare
          </button>
        </div>
      </div>

      <div className="compare-inputs">
        <div className="compare-col">
          <label className="compare-label">Prompt A</label>
          <textarea
            value={promptA}
            onChange={(e) => setPromptA(e.target.value)}
            placeholder="Enter first prompt…"
            rows={6}
          />
        </div>
        <div className="compare-col">
          <label className="compare-label">Prompt B</label>
          <textarea
            value={promptB}
            onChange={(e) => setPromptB(e.target.value)}
            placeholder="Enter second prompt…"
            rows={6}
          />
        </div>
      </div>

      {results && (
        <div className="compare-results animate-fade-up">
          {/* Winner Banner */}
          <div className="winner-banner">
            🏆 Prompt {results.winner} is more cost-efficient!
            <span className="winner-detail">
              {results.winner === 'A'
                ? `${formatUSD(results.b.costTrim - results.a.costTrim)} cheaper per request`
                : `${formatUSD(results.a.costTrim - results.b.costTrim)} cheaper per request`}
            </span>
          </div>

          {/* Chart */}
          <div className="compare-chart">
            <canvas ref={canvasRef} />
          </div>

          {/* Stats Comparison */}
          <div className="compare-stats-grid">
            <div className="compare-stat-card glass-panel">
              <h4>Prompt A</h4>
              <div className="stat-row">
                <span>Original:</span>
                <span>{results.a.original.toLocaleString()} tokens ({formatUSD(results.a.costOrig)})</span>
              </div>
              <div className="stat-row">
                <span>Trimmed:</span>
                <span>{results.a.trimmed.toLocaleString()} tokens ({formatUSD(results.a.costTrim)})</span>
              </div>
              <div className="stat-row highlight">
                <span>Savings:</span>
                <span>{results.a.savings.toFixed(1)}%</span>
              </div>
            </div>

            <div className="compare-stat-card glass-panel">
              <h4>Prompt B</h4>
              <div className="stat-row">
                <span>Original:</span>
                <span>{results.b.original.toLocaleString()} tokens ({formatUSD(results.b.costOrig)})</span>
              </div>
              <div className="stat-row">
                <span>Trimmed:</span>
                <span>{results.b.trimmed.toLocaleString()} tokens ({formatUSD(results.b.costTrim)})</span>
              </div>
              <div className="stat-row highlight">
                <span>Savings:</span>
                <span>{results.b.savings.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Trimmed Text Comparison */}
          <div className="trim-comparison">
            <div className="comparison-col">
              <div className="comparison-label">A - Trimmed</div>
              <div className="comparison-text">{results.a.trimmedText}</div>
            </div>
            <div className="comparison-col">
              <div className="comparison-label trimmed-label">B - Trimmed</div>
              <div className="comparison-text">{results.b.trimmedText}</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

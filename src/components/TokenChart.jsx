import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function TokenChart({ originalTokens, trimmedTokens }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy previous chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');

    // Gradient fills
    const gradOrig = ctx.createLinearGradient(0, 0, 0, 260);
    gradOrig.addColorStop(0, 'rgba(99, 102, 241, 0.9)');
    gradOrig.addColorStop(1, 'rgba(99, 102, 241, 0.2)');

    const gradTrim = ctx.createLinearGradient(0, 0, 0, 260);
    gradTrim.addColorStop(0, 'rgba(16, 185, 129, 0.9)');
    gradTrim.addColorStop(1, 'rgba(16, 185, 129, 0.2)');

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Original Prompt', 'Trimmed Prompt'],
        datasets: [
          {
            label: 'Token Count',
            data: [originalTokens, trimmedTokens],
            backgroundColor: [gradOrig, gradTrim],
            borderColor: ['rgba(99,102,241,1)', 'rgba(16,185,129,1)'],
            borderWidth: 2,
            borderRadius: 10,
            borderSkipped: false,
            barThickness: 64,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1d2e',
            borderColor: 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            titleColor: '#e2e8f0',
            bodyColor: '#94a3b8',
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              title: (items) => items[0].label,
              label: (item) => ` ${item.raw.toLocaleString()} tokens`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: '#64748b', font: { family: "'Inter', sans-serif", size: 12 } },
            border: { color: 'rgba(255,255,255,0.06)' },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: {
              color: '#64748b',
              font: { family: "'Inter', sans-serif", size: 11 },
              callback: (v) => v.toLocaleString(),
            },
            border: { color: 'rgba(255,255,255,0.06)' },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [originalTokens, trimmedTokens]);

  if (!originalTokens) {
    return (
      <section className="panel glass-panel chart-panel" aria-label="Token analytics chart">
        <div className="panel-header">
          <h2 className="panel-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Token Analytics
          </h2>
        </div>
        <div className="chart-wrapper">
          <div className="chart-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <p>Run analysis to see token breakdown chart</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel glass-panel chart-panel" aria-label="Token analytics chart">
      <div className="panel-header">
        <h2 className="panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Token Analytics
        </h2>
        <span className="panel-subtitle">Original vs Trimmed comparison</span>
      </div>
      <div className="chart-wrapper">
        <canvas ref={canvasRef} aria-label="Bar chart comparing original and trimmed token counts" />
      </div>
    </section>
  );
}

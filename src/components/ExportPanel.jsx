import React, { useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import Chart from 'chart.js/auto';
import {
  computeTokenScores,
  getTokenDistribution,
  getTokenCategory,
  formatUSD,
  MODEL_PRICING,
} from '../utils/tokenizer';

export default function ExportPanel({ stats, original, trimmed, tokenData, history }) {
  const chartCanvasRef = useRef(null);
  const pieCanvasRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const pieInstanceRef = useRef(null);

  // Render charts for PDF
  useEffect(() => {
    if (!stats || !chartCanvasRef.current) return;

    // Bar chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartCanvasRef.current.getContext('2d');
    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Original', 'Trimmed'],
        datasets: [
          {
            label: 'Tokens',
            data: [stats.original_tokens, stats.trimmed_tokens],
            backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(16, 185, 129, 0.8)'],
            borderColor: ['rgba(99, 102, 241, 1)', 'rgba(16, 185, 129, 1)'],
            borderWidth: 2,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#333' },
            grid: { color: 'rgba(0,0,0,0.1)' },
          },
          x: {
            ticks: { color: '#333' },
            grid: { display: false },
          },
        },
      },
    });

    // Pie chart
    if (pieInstanceRef.current) {
      pieInstanceRef.current.destroy();
    }

    const dist = getTokenDistribution(tokenData || []);
    const pieCtx = pieCanvasRef.current.getContext('2d');
    pieInstanceRef.current = new Chart(pieCtx, {
      type: 'pie',
      data: {
        labels: ['Critical', 'Important', 'Context', 'Noise'],
        datasets: [
          {
            data: [dist.critical, dist.important, dist.context, dist.noise],
            backgroundColor: [
              'rgba(239, 68, 68, 0.8)',
              'rgba(249, 115, 22, 0.8)',
              'rgba(234, 179, 8, 0.8)',
              'rgba(107, 114, 128, 0.8)',
            ],
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: false,
        animation: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#333', padding: 10 },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
      if (pieInstanceRef.current) pieInstanceRef.current.destroy();
    };
  }, [stats, tokenData]);

  // Export PDF
  const exportPDF = async () => {
    if (!stats) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    // Title
    doc.setFontSize(24);
    doc.setTextColor(99, 102, 241);
    doc.text('TokenScope Report', margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()} | Model: ${MODEL_PRICING[stats.model]?.name || stats.model}`, margin, y);
    y += 15;

    // Stats Table
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Token Analysis Summary', margin, y);
    y += 8;

    doc.setFontSize(10);
    const tableData = [
      ['Metric', 'Original', 'Trimmed', 'Saved'],
      ['Tokens', stats.original_tokens.toLocaleString(), stats.trimmed_tokens.toLocaleString(), `${(stats.original_tokens - stats.trimmed_tokens).toLocaleString()} (${stats.savings_percentage.toFixed(1)}%)`],
      ['Cost (USD)', formatUSD(stats.cost_original_usd), formatUSD(stats.cost_trimmed_usd), formatUSD(stats.cost_original_usd - stats.cost_trimmed_usd)],
    ];

    tableData.forEach((row, i) => {
      const bgColor = i === 0 ? [99, 102, 241] : [245, 245, 245];
      doc.setFillColor(...bgColor);
      doc.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F');

      row.forEach((cell, j) => {
        const x = margin + 5 + j * 42;
        doc.setTextColor(i === 0 ? 255 : 0);
        doc.text(cell, x, y);
      });
      y += 8;
    });

    y += 10;

    // Bar Chart
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Token Comparison Chart', margin, y);
    y += 8;

    if (chartCanvasRef.current) {
      const barImage = chartCanvasRef.current.toDataURL('image/png');
      doc.addImage(barImage, 'PNG', margin, y, 85, 55);
    }

    // Pie Chart
    if (pieCanvasRef.current) {
      const pieImage = pieCanvasRef.current.toDataURL('image/png');
      doc.addImage(pieImage, 'PNG', pageWidth - margin - 85, y, 85, 55);
    }
    y += 65;

    // Original Prompt
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Original Prompt', margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setTextColor(60);
    const origLines = doc.splitTextToSize(original || 'N/A', pageWidth - 2 * margin);
    doc.text(origLines.slice(0, 8), margin, y);
    y += origLines.slice(0, 8).length * 5 + 10;

    // Trimmed Prompt
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Optimized (Trimmed) Prompt', margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    const trimLines = doc.splitTextToSize(trimmed || 'N/A', pageWidth - 2 * margin);
    doc.text(trimLines.slice(0, 8), margin, y);
    y += trimLines.slice(0, 8).length * 5 + 10;

    // Token Scores Table (if room)
    if (y < 240 && tokenData && tokenData.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Top Token Importance Scores', margin, y);
      y += 8;

      doc.setFontSize(8);
      const topTokens = tokenData
        .filter((t) => t.text.trim())
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);

      // Header
      doc.setFillColor(50, 50, 50);
      doc.rect(margin, y - 4, pageWidth - 2 * margin, 6, 'F');
      doc.setTextColor(255);
      doc.text('Token', margin + 3, y);
      doc.text('Score', margin + 80, y);
      doc.text('Category', margin + 110, y);
      y += 6;

      topTokens.forEach((token, i) => {
        if (y > 280) return;
        const cat = getTokenCategory(token.score);
        doc.setFillColor(i % 2 === 0 ? 245 : 255);
        doc.rect(margin, y - 4, pageWidth - 2 * margin, 5, 'F');
        doc.setTextColor(0);
        doc.text(token.text.replace(/\n/g, '↵'), margin + 3, y);
        doc.text(`${(token.score * 100).toFixed(1)}%`, margin + 80, y);
        doc.text(cat.label, margin + 110, y);
        y += 5;
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Generated by TokenScope v3.0 — AI Prompt Optimization Dashboard', margin, 290);

    doc.save('tokenscope-report.pdf');
  };


  // Copy Markdown
  const copyMarkdown = () => {
    if (!stats) return;

    const dist = getTokenDistribution(tokenData || []);
    const topTokens = (tokenData || [])
      .filter((t) => t.text.trim())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const md = `# TokenScope Analysis Report

**Generated:** ${new Date().toLocaleString()}
**Model:** ${MODEL_PRICING[stats.model]?.name || stats.model}

## Summary

| Metric | Value |
|--------|-------|
| Original Tokens | ${stats.original_tokens.toLocaleString()} |
| Trimmed Tokens | ${stats.trimmed_tokens.toLocaleString()} |
| Tokens Saved | ${(stats.original_tokens - stats.trimmed_tokens).toLocaleString()} (${stats.savings_percentage.toFixed(1)}%) |
| Original Cost | ${formatUSD(stats.cost_original_usd)} |
| Trimmed Cost | ${formatUSD(stats.cost_trimmed_usd)} |
| Money Saved | ${formatUSD(stats.cost_original_usd - stats.cost_trimmed_usd)} |

## Token Distribution

| Category | Count |
|----------|-------|
| 🔴 Critical | ${dist.critical} |
| 🟠 Important | ${dist.important} |
| 🟡 Context | ${dist.context} |
| ⚫ Noise | ${dist.noise} |

## Top Tokens by Importance

| Token | Score | Category |
|-------|-------|----------|
${topTokens.map((t) => `| \`${t.text.replace(/\n/g, '↵')}\` | ${(t.score * 100).toFixed(1)}% | ${getTokenCategory(t.score).label} |`).join('\n')}

## Original Prompt

\`\`\`
${original}
\`\`\`

## Trimmed Prompt

\`\`\`
${trimmed}
\`\`\`

---
*Generated by TokenScope v3.0*
`;

    navigator.clipboard.writeText(md).then(() => {
      alert('Markdown copied to clipboard!');
    });
  };

  if (!stats) return null;

  return (
    <section className="panel glass-panel export-panel" aria-label="Export options">
      <div className="panel-header">
        <h2 className="panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          📄 Export Report
        </h2>
      </div>

      <div className="export-buttons">
        <button className="btn btn-export btn-pdf" onClick={exportPDF}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          Download PDF
          <span className="btn-desc">Full report with charts & scores</span>
        </button>


        <button className="btn btn-export btn-md" onClick={copyMarkdown}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy Markdown
          <span className="btn-desc">Formatted for docs & README</span>
        </button>
      </div>

      {/* Hidden canvases for PDF chart generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <canvas ref={chartCanvasRef} width={340} height={220} />
        <canvas ref={pieCanvasRef} width={340} height={220} />
      </div>
    </section>
  );
}

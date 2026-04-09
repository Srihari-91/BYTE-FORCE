"""
TokenScope v3.0 — FastAPI Backend
Server-side export endpoints for PDF, JSON, and Markdown reports.
"""

import os
import json
import io
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional

# PDF generation
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch, mm
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        PageBreak, Image
    )
    from reportlab.graphics.shapes import Drawing, Rect, String
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    from reportlab.graphics.charts.piecharts import Pie
    from reportlab.graphics import renderPDF
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

# ─────────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────────
app = FastAPI(
    title="TokenScope API",
    version="3.0.0",
    description="LLM Prompt Analyzer with Export Capabilities"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────
class TokenScore(BaseModel):
    token: str
    score: float
    category: str

class AnalysisData(BaseModel):
    original_prompt: str
    trimmed_prompt: str
    original_tokens: int
    trimmed_tokens: int
    savings_percentage: float
    cost_original_usd: float
    cost_trimmed_usd: float
    model: str
    token_scores: List[TokenScore]
    token_distribution: dict

class CompareData(BaseModel):
    prompt_a: str
    prompt_b: str
    trimmed_a: str
    trimmed_b: str
    tokens_original_a: int
    tokens_trimmed_a: int
    tokens_original_b: int
    tokens_trimmed_b: int
    cost_a: float
    cost_b: float
    winner: str

# ─────────────────────────────────────────────
# Helper: Generate Bar Chart Drawing
# ─────────────────────────────────────────────
def create_bar_chart(original_tokens: int, trimmed_tokens: int) -> Drawing:
    """Create a bar chart comparing original vs trimmed tokens."""
    d = Drawing(400, 200)
    
    # Background
    d.add(Rect(0, 0, 400, 200, fillColor=colors.HexColor('#f8fafc'),
               strokeColor=colors.HexColor('#e2e8f0'), strokeWidth=1))
    
    bc = VerticalBarChart()
    bc.x = 50
    bc.y = 30
    bc.height = 140
    bc.width = 300
    bc.data = [[original_tokens], [trimmed_tokens]]
    bc.categoryAxis.categoryNames = ['Prompt']
    bc.categoryAxis.labels.fontSize = 10
    bc.valueAxis.valueMin = 0
    bc.valueAxis.valueMax = max(original_tokens, trimmed_tokens) * 1.1
    bc.valueAxis.labels.fontSize = 9
    bc.bars[0].fillColor = colors.HexColor('#6366f1')
    bc.bars[1].fillColor = colors.HexColor('#10b981')
    bc.barWidth = 40
    bc.groupSpacing = 20
    
    d.add(bc)
    
    # Legend
    d.add(Rect(120, 175, 12, 12, fillColor=colors.HexColor('#6366f1')))
    d.add(String(137, 178, 'Original', fontSize=9))
    d.add(Rect(200, 175, 12, 12, fillColor=colors.HexColor('#10b981')))
    d.add(String(217, 178, 'Trimmed', fontSize=9))
    
    return d

def create_pie_chart(distribution: dict) -> Drawing:
    """Create a pie chart showing token importance distribution."""
    d = Drawing(300, 200)
    
    pie = Pie()
    pie.x = 75
    pie.y = 20
    pie.width = 150
    pie.height = 150
    pie.data = [
        distribution.get('critical', 0),
        distribution.get('important', 0),
        distribution.get('context', 0),
        distribution.get('noise', 0),
    ]
    pie.labels = ['Critical', 'Important', 'Context', 'Noise']
    pie.slices[0].fillColor = colors.HexColor('#ef4444')
    pie.slices[1].fillColor = colors.HexColor('#f97316')
    pie.slices[2].fillColor = colors.HexColor('#eab308')
    pie.slices[3].fillColor = colors.HexColor('#6b7280')
    pie.sideLabels = True
    pie.simpleLabels = False
    pie.slices.strokeWidth = 1
    pie.slices.strokeColor = colors.white
    
    d.add(pie)
    return d

# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "TokenScope API",
        "version": "3.0.0",
        "endpoints": [
            "POST /api/export/pdf - Generate PDF report",
            "POST /api/export/json - Export JSON analysis",
            "POST /api/export/markdown - Generate Markdown report",
            "POST /api/compare/export - Export comparison report",
        ]
    }

@app.post("/api/export/pdf")
async def export_pdf(data: AnalysisData):
    """Generate a PDF report with charts and token analysis."""
    if not REPORTLAB_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="reportlab not installed. Run: pip install reportlab"
        )
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=50,
        leftMargin=50,
        topMargin=50,
        bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#6366f1'),
        spaceAfter=20,
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=15,
        spaceAfter=10,
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#475569'),
        leading=14,
    )
    
    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#1e293b'),
        fontName='Courier',
        leading=12,
        backColor=colors.HexColor('#f1f5f9'),
        leftIndent=10,
        rightIndent=10,
        spaceBefore=5,
        spaceAfter=5,
    )
    
    trimmed_style = ParagraphStyle(
        'TrimmedStyle',
        parent=code_style,
        textColor=colors.HexColor('#166534'),
        backColor=colors.HexColor('#dcfce7'),
    )
    
    elements = []
    
    # Title
    elements.append(Paragraph("TokenScope Analysis Report", title_style))
    elements.append(Paragraph(
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Model: {data.model}",
        body_style
    ))
    elements.append(Spacer(1, 20))
    
    # Stats Table
    elements.append(Paragraph("Token Analysis Summary", heading_style))
    
    saved_tokens = data.original_tokens - data.trimmed_tokens
    money_saved = data.cost_original_usd - data.cost_trimmed_usd
    
    table_data = [
        ['Metric', 'Original', 'Trimmed', 'Saved'],
        ['Tokens', 
         f"{data.original_tokens:,}", 
         f"{data.trimmed_tokens:,}", 
         f"{saved_tokens:,} ({data.savings_percentage:.1f}%)"],
        ['Cost (USD)', 
         f"${data.cost_original_usd:.6f}", 
         f"${data.cost_trimmed_usd:.6f}", 
         f"${money_saved:.6f}"],
    ]
    
    table = Table(table_data, colWidths=[100, 120, 120, 130])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#f8fafc')),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#ffffff')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f8fafc'), colors.white]),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))
    
    # Charts
    elements.append(Paragraph("Visual Analysis", heading_style))
    
    # Bar Chart
    bar_chart = create_bar_chart(data.original_tokens, data.trimmed_tokens)
    elements.append(bar_chart)
    elements.append(Spacer(1, 15))
    
    # Pie Chart
    pie_chart = create_pie_chart(data.token_distribution)
    elements.append(pie_chart)
    elements.append(Spacer(1, 20))
    
    # Token Scores Table
    elements.append(Paragraph("Top Token Importance Scores", heading_style))
    
    sorted_tokens = sorted(data.token_scores, key=lambda x: x.score, reverse=True)[:15]
    score_data = [['Token', 'Score', 'Category']]
    for t in sorted_tokens:
        score_data.append([t.token[:20], f"{t.score * 100:.1f}%", t.category])
    
    score_table = Table(score_data, colWidths=[200, 80, 100])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f8fafc'), colors.white]),
    ]))
    elements.append(score_table)
    elements.append(Spacer(1, 20))
    
    # Prompts
    elements.append(Paragraph("Original Prompt", heading_style))
    
    # Wrap long text for PDF
    orig_text = data.original_prompt.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    orig_lines = [orig_text[i:i+80] for i in range(0, len(orig_text), 80)]
    for line in orig_lines[:10]:
        elements.append(Paragraph(line, code_style))
    if len(orig_lines) > 10:
        elements.append(Paragraph(f"... ({len(orig_lines) - 10} more lines)", body_style))
    
    elements.append(Spacer(1, 15))
    elements.append(Paragraph("Optimized (Trimmed) Prompt", heading_style))
    
    trim_text = data.trimmed_prompt.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    trim_lines = [trim_text[i:i+80] for i in range(0, len(trim_text), 80)]
    for line in trim_lines[:10]:
        elements.append(Paragraph(line, trimmed_style))
    if len(trim_lines) > 10:
        elements.append(Paragraph(f"... ({len(trim_lines) - 10} more lines)", body_style))
    
    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph(
        "Generated by TokenScope v3.0 — AI Prompt Optimization Dashboard",
        ParagraphStyle('Footer', parent=body_style, fontSize=8, textColor=colors.HexColor('#94a3b8'))
    ))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=tokenscope-report.pdf"}
    )


@app.post("/api/export/json")
async def export_json(data: AnalysisData):
    """Export analysis data as JSON."""
    saved_tokens = data.original_tokens - data.trimmed_tokens
    money_saved = data.cost_original_usd - data.cost_trimmed_usd
    
    export_data = {
        "metadata": {
            "generated": datetime.now().isoformat(),
            "tool": "TokenScope v3.0",
            "version": "3.0.0"
        },
        "analysis": {
            "model": data.model,
            "original_tokens": data.original_tokens,
            "trimmed_tokens": data.trimmed_tokens,
            "saved_tokens": saved_tokens,
            "savings_percentage": data.savings_percentage,
            "cost_original_usd": data.cost_original_usd,
            "cost_trimmed_usd": data.cost_trimmed_usd,
            "money_saved_usd": money_saved
        },
        "prompts": {
            "original": data.original_prompt,
            "trimmed": data.trimmed_prompt
        },
        "token_distribution": data.token_distribution,
        "token_scores": [
            {
                "token": t.token,
                "score": t.score,
                "category": t.category
            }
            for t in data.token_scores
        ]
    }
    
    return JSONResponse(
        content=export_data,
        headers={"Content-Disposition": "attachment; filename=tokenscope-analysis.json"}
    )


@app.post("/api/export/markdown")
async def export_markdown(data: AnalysisData):
    """Generate Markdown report."""
    saved_tokens = data.original_tokens - data.trimmed_tokens
    money_saved = data.cost_original_usd - data.cost_trimmed_usd
    
    top_tokens = sorted(data.token_scores, key=lambda x: x.score, reverse=True)[:10]
    
    dist = data.token_distribution
    
    md = f"""# TokenScope Analysis Report

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Model:** {data.model}

## Summary

| Metric | Value |
|--------|-------|
| Original Tokens | {data.original_tokens:,} |
| Trimmed Tokens | {data.trimmed_tokens:,} |
| Tokens Saved | {saved_tokens:,} ({data.savings_percentage:.1f}%) |
| Original Cost | ${data.cost_original_usd:.6f} |
| Trimmed Cost | ${data.cost_trimmed_usd:.6f} |
| Money Saved | ${money_saved:.6f} |

## Token Distribution

| Category | Count |
|----------|-------|
| 🔴 Critical | {dist.get('critical', 0)} |
| 🟠 Important | {dist.get('important', 0)} |
| 🟡 Context | {dist.get('context', 0)} |
| ⚫ Noise | {dist.get('noise', 0)} |

## Top Tokens by Importance

| Token | Score | Category |
|-------|-------|----------|
"""
    
    for t in top_tokens:
        md += f"| `{t.token.replace(chr(10), '↵')}` | {t.score * 100:.1f}% | {t.category} |\n"
    
    md += f"""
## Original Prompt

```
{data.original_prompt}
```

## Trimmed Prompt

```
{data.trimmed_prompt}
```

---
*Generated by TokenScope v3.0 — AI Prompt Optimization Dashboard*
"""
    
    return JSONResponse(
        content={"markdown": md},
        headers={"Content-Disposition": "attachment; filename=tokenscope-report.md"}
    )


@app.post("/api/compare/export")
async def export_comparison(data: CompareData):
    """Export comparison report as JSON."""
    savings_a = ((data.tokens_original_a - data.tokens_trimmed_a) / data.tokens_original_a * 100) if data.tokens_original_a > 0 else 0
    savings_b = ((data.tokens_original_b - data.tokens_trimmed_b) / data.tokens_original_b * 100) if data.tokens_original_b > 0 else 0
    
    export_data = {
        "metadata": {
            "generated": datetime.now().isoformat(),
            "tool": "TokenScope v3.0",
            "type": "comparison"
        },
        "prompt_a": {
            "original": data.prompt_a,
            "trimmed": data.trimmed_a,
            "original_tokens": data.tokens_original_a,
            "trimmed_tokens": data.tokens_trimmed_a,
            "savings_percentage": savings_a,
            "cost": data.cost_a
        },
        "prompt_b": {
            "original": data.prompt_b,
            "trimmed": data.trimmed_b,
            "original_tokens": data.tokens_original_b,
            "trimmed_tokens": data.tokens_trimmed_b,
            "savings_percentage": savings_b,
            "cost": data.cost_b
        },
        "winner": data.winner,
        "cost_difference": abs(data.cost_a - data.cost_b)
    }
    
    return JSONResponse(
        content=export_data,
        headers={"Content-Disposition": "attachment; filename=tokenscope-comparison.json"}
    )


@app.get("/api/health")
async def health():
    return {"status": "healthy", "reportlab": REPORTLAB_AVAILABLE}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

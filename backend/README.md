# TokenScope Backend

FastAPI backend for server-side export endpoints (PDF, JSON, Markdown).

## Quick Start

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## API Endpoints

### `POST /api/export/pdf`
Generate a PDF report with charts and token analysis.

**Request Body:**
```json
{
  "original_prompt": "Your prompt text...",
  "trimmed_prompt": "Optimized prompt...",
  "original_tokens": 50,
  "trimmed_tokens": 30,
  "savings_percentage": 40.0,
  "cost_original_usd": 0.000008,
  "cost_trimmed_usd": 0.000005,
  "model": "gpt-4o-mini",
  "token_scores": [
    {"token": "write", "score": 0.85, "category": "Critical"},
    {"token": "Python", "score": 0.72, "category": "Important"}
  ],
  "token_distribution": {
    "critical": 5,
    "important": 10,
    "context": 15,
    "noise": 20
  }
}
```

**Response:** PDF file download

### `POST /api/export/json`
Export analysis data as JSON file.

**Response:** JSON file download

### `POST /api/export/markdown`
Generate Markdown report.

**Response:** JSON with `markdown` field

### `POST /api/compare/export`
Export comparison report as JSON.

**Request Body:**
```json
{
  "prompt_a": "First prompt...",
  "prompt_b": "Second prompt...",
  "trimmed_a": "Trimmed A...",
  "trimmed_b": "Trimmed B...",
  "tokens_original_a": 50,
  "tokens_trimmed_a": 30,
  "tokens_original_b": 60,
  "tokens_trimmed_b": 35,
  "cost_a": 0.000008,
  "cost_b": 0.000009,
  "winner": "A"
}
```

## Running Both Frontend & Backend

**Terminal 1 - Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:8000
API Docs: http://localhost:8000/docs

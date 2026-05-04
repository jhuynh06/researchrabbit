# ResearchRabbit

ResearchRabbit is an early MVP Chrome extension + Python backend that finds relevant chunks from HTML research webpages.

## What Works

- Extracts visible text from the active HTML webpage.
- Sends the text and a student prompt to a local FastAPI backend.
- Chunks the page text and ranks chunks with local embeddings.
- Displays top chunks in the Chrome extension popup.

PDF support is intentionally out of scope for this MVP because PDFs often open outside Chrome or inside Chrome's PDF viewer, where reliable text extraction is inconsistent.

## Backend Setup

From the repo root:

**macOS/Linux:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Windows (PowerShell):**

If you get an execution policy error, run this once first:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

You'll know the venv is active when `(.venv)` appears at the start of your prompt.

The first ranking request downloads the default embedding model:

```text
sentence-transformers/all-MiniLM-L6-v2
```

Health check:

```bash
curl http://localhost:8000/health
```

Example request:

```bash
curl -X POST http://localhost:8000/rank-chunks \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What dataset did the authors use?",
    "page_text": "Paste at least 100 characters of article text here...",
    "top_k": 5,
    "url": "https://example.com/article"
  }'
```

## Chrome Extension Setup

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click **Load unpacked**.
4. Select this repo folder.
5. Start the backend on `localhost:8000`.
6. Open an HTML research webpage.
7. Click the ResearchRabbit extension icon.
8. Enter a prompt and click **Find Relevant Chunks**.

## Test Pages

Use HTML article pages first:

- arXiv abstract pages
- PubMed pages
- journal article HTML pages

Avoid PDFs for this MVP.

## Development

Run backend tests:

```bash
cd backend
PYTHONPATH=. pytest
```

## API

`POST /rank-chunks`

Request:

```json
{
  "prompt": "What dataset did the authors use?",
  "page_text": "Visible webpage text...",
  "top_k": 5,
  "url": "https://example.com/paper"
}
```

Response:

```json
{
  "chunks": [
    {
      "rank": 1,
      "score": 0.84,
      "text": "The study uses the MIMIC-III dataset...",
      "explanation": "Highest semantic match to the prompt."
    }
  ]
}
```

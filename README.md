# FroggyFind

FroggyFind is a Chrome extension that finds relevant chunks from HTML research webpages using semantic search.

## How It Works

- Extracts visible text from the active HTML webpage
- Sends the text and a student prompt to the hosted backend (DigitalOcean App Platform)
- Backend chunks the page text and ranks chunks with embeddings via DO GenAI Inference Router
- Displays top chunks in the Chrome extension popup/FAB

PDF support is intentionally out of scope — PDFs often open outside Chrome or inside Chrome's PDF viewer, where reliable text extraction is inconsistent.

## Chrome Extension Setup

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click **Load unpacked**
4. Select this repo folder
5. Open an HTML research webpage
6. Click the ResearchRabbit extension icon or use the floating action button
7. Enter a prompt and click **Find Relevant Chunks**

No local server required — the extension connects to the hosted backend automatically.

## Backend

The backend lives in a separate repository: [researchrabbit-backend](https://github.com/YOUR_USERNAME/researchrabbit-backend)

It's deployed on DigitalOcean App Platform and uses the DO GenAI Inference Router for embeddings.

## Test Pages

Use HTML article pages:

- arXiv abstract pages
- PubMed pages
- Journal article HTML pages

Avoid PDFs for this MVP.

## API

`POST /rank-chunks` (hosted at `https://researchrabbit-backend-xxxxx.ondigitalocean.app`)

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

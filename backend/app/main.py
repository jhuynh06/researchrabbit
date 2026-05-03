from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.ranking import rank_chunks
from app.schemas import RankChunksRequest, RankChunksResponse

app = FastAPI(title="ResearchRabbit Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*", "http://localhost", "http://127.0.0.1"],
    allow_origin_regex=r"chrome-extension://.*",
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/rank-chunks", response_model=RankChunksResponse)
def rank_chunks_endpoint(request: RankChunksRequest) -> RankChunksResponse:
    settings = get_settings()

    if len(request.page_text) < settings.min_page_text_chars:
        raise HTTPException(
            status_code=400,
            detail="Extracted page text is too short. Open an HTML research page and try again.",
        )

    chunks = rank_chunks(
        prompt=request.prompt,
        page_text=request.page_text,
        top_k=request.top_k,
    )
    return RankChunksResponse(chunks=chunks)

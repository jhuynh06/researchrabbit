import numpy as np

from app.chunking import TextChunk, chunk_text
from app.config import get_settings
from app.embeddings import embed_texts
from app.preprocessing import preprocess_text
from app.schemas import RankedChunk


def cosine_scores(prompt_embedding: np.ndarray, chunk_embeddings: np.ndarray) -> np.ndarray:
    return np.dot(chunk_embeddings, prompt_embedding)


def rank_chunks(prompt: str, page_text: str, top_k: int | None = None) -> list[RankedChunk]:
    settings = get_settings()
    clean_text = preprocess_text(page_text)
    chunks = chunk_text(
        clean_text,
        max_words=settings.max_chunk_words,
        overlap_words=settings.overlap_words,
    )

    if not chunks:
        return []

    requested_top_k = top_k or settings.default_top_k
    effective_top_k = min(requested_top_k, settings.max_top_k, len(chunks))
    texts = [prompt, *[chunk.text for chunk in chunks]]
    embeddings = embed_texts(texts)
    scores = cosine_scores(embeddings[0], embeddings[1:])
    ranked_indexes = np.argsort(scores)[::-1][:effective_top_k]

    return [
        build_ranked_chunk(
            rank=rank,
            chunk=chunks[index],
            score=float(scores[index]),
            explanation=settings.candidate_explanation,
        )
        for rank, index in enumerate(ranked_indexes, start=1)
    ]


def build_ranked_chunk(rank: int, chunk: TextChunk, score: float, explanation: str) -> RankedChunk:
    return RankedChunk(
        rank=rank,
        score=round(score, 4),
        text=chunk.text,
        explanation=explanation,
    )

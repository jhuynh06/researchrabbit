from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import get_settings


@lru_cache
def get_embedding_model() -> SentenceTransformer:
    settings = get_settings()
    return SentenceTransformer(settings.embedding_model_name)


def embed_texts(texts: list[str]) -> np.ndarray:
    model = get_embedding_model()
    embeddings = model.encode(texts, normalize_embeddings=True)
    return np.asarray(embeddings)

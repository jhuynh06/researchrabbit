from functools import lru_cache
from hashlib import blake2b

import numpy as np

from app.config import get_settings

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

FALLBACK_DIMENSIONS = 384


@lru_cache
def get_embedding_model():
    if SentenceTransformer is None:
        return None

    settings = get_settings()
    return SentenceTransformer(settings.embedding_model_name)


def embed_texts(texts: list[str]) -> np.ndarray:
    model = get_embedding_model()
    if model is None:
        return embed_texts_locally(texts)

    embeddings = model.encode(texts, normalize_embeddings=True)
    return np.asarray(embeddings)


def embed_texts_locally(texts: list[str]) -> np.ndarray:
    vectors = np.asarray([hash_text(text) for text in texts], dtype=np.float32)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return vectors / np.maximum(norms, 1e-12)


def hash_text(text: str) -> np.ndarray:
    vector = np.zeros(FALLBACK_DIMENSIONS, dtype=np.float32)
    for token in text.lower().split():
        digest = blake2b(token.encode("utf-8"), digest_size=8).digest()
        bucket = int.from_bytes(digest[:4], "little") % FALLBACK_DIMENSIONS
        sign = 1 if digest[4] % 2 == 0 else -1
        vector[bucket] += sign
    return vector

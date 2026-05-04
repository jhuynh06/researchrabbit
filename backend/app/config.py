from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    max_chunk_words: int = 850
    overlap_words: int = 125
    candidate_explanation: str = "Highest semantic match to the prompt."
    min_page_text_chars: int = 100
    default_top_k: int = 5
    max_top_k: int = 10


@lru_cache
def get_settings() -> Settings:
    return Settings()

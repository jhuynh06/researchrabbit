import numpy as np
from types import SimpleNamespace

from app.ranking import rank_chunks


def test_rank_chunks_sorts_by_similarity(monkeypatch) -> None:
    def fake_embed_texts(texts: list[str]) -> np.ndarray:
        assert texts[0] == "dataset"
        return np.array(
            [
                [1.0, 0.0],
                [0.1, 0.9],
                [0.9, 0.1],
            ]
        )

    monkeypatch.setattr("app.ranking.embed_texts", fake_embed_texts)
    monkeypatch.setattr(
        "app.ranking.get_settings",
        lambda: SimpleNamespace(
            max_chunk_words=5,
            overlap_words=0,
            default_top_k=5,
            max_top_k=10,
            candidate_explanation="Highest semantic match to the prompt.",
        ),
    )
    page_text = "Background information about theory.\n\nThe dataset contains clinical records."

    chunks = rank_chunks(page_text=page_text, prompt="dataset", top_k=2)

    assert chunks[0].text == "The dataset contains clinical records."
    assert chunks[0].score > chunks[1].score

from app.chunking import chunk_text


def test_chunk_text_splits_and_overlaps_long_paragraph() -> None:
    text = " ".join(f"word{index}" for index in range(25))

    chunks = chunk_text(text, max_words=10, overlap_words=2)

    assert len(chunks) == 4
    assert chunks[0].text.split()[-2:] == chunks[1].text.split()[:2]


def test_chunk_text_keeps_short_text_as_single_chunk() -> None:
    text = "Methods\n\nThis study uses a public benchmark dataset."

    chunks = chunk_text(text, max_words=50, overlap_words=5)

    assert len(chunks) == 1
    assert "benchmark dataset" in chunks[0].text

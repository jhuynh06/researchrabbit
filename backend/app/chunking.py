from dataclasses import dataclass


@dataclass(frozen=True)
class TextChunk:
    chunk_id: int
    text: str


def count_words(text: str) -> int:
    return len(text.split())


def split_paragraphs(text: str) -> list[str]:
    paragraphs = [paragraph.strip() for paragraph in text.split("\n\n")]
    return [paragraph for paragraph in paragraphs if paragraph]


def last_words(text: str, word_count: int) -> str:
    if word_count <= 0:
        return ""
    words = text.split()
    if len(words) <= word_count:
        return text
    return " ".join(words[-word_count:])


def chunk_text(text: str, max_words: int, overlap_words: int) -> list[TextChunk]:
    paragraphs = split_paragraphs(text)
    chunks: list[str] = []
    current: list[str] = []
    current_words = 0

    for paragraph in paragraphs:
        paragraph_words = count_words(paragraph)

        if paragraph_words > max_words:
            if current:
                chunks.append("\n\n".join(current))
                current = []
                current_words = 0

            words = paragraph.split()
            start = 0
            step = max(max_words - overlap_words, 1)
            while start < len(words):
                chunks.append(" ".join(words[start : start + max_words]))
                start += step
            continue

        if current and current_words + paragraph_words > max_words:
            chunk = "\n\n".join(current)
            chunks.append(chunk)
            overlap = last_words(chunk, overlap_words)
            current = [overlap, paragraph] if overlap else [paragraph]
            current_words = count_words("\n\n".join(current))
        else:
            current.append(paragraph)
            current_words += paragraph_words

    if current:
        chunks.append("\n\n".join(current))

    return [TextChunk(chunk_id=index, text=chunk) for index, chunk in enumerate(chunks)]

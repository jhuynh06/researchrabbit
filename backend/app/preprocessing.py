import re
import unicodedata
from collections import Counter


NOISE_PATTERNS = (
    "cookie",
    "privacy policy",
    "terms of use",
    "sign in",
    "log in",
    "subscribe",
    "advertisement",
    "accept all",
)


def normalize_text(raw_text: str) -> str:
    text = unicodedata.normalize("NFKC", raw_text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def remove_duplicate_lines(text: str) -> str:
    lines = [line.strip() for line in text.splitlines()]
    non_empty_counts = Counter(line for line in lines if line)
    kept_lines = []

    for line in lines:
        if not line:
            kept_lines.append("")
            continue

        lower_line = line.lower()
        is_repeated_short_line = non_empty_counts[line] > 2 and len(line.split()) <= 12
        is_noise_line = len(line.split()) <= 8 and any(pattern in lower_line for pattern in NOISE_PATTERNS)

        if not is_repeated_short_line and not is_noise_line:
            kept_lines.append(line)

    return "\n".join(kept_lines)


def drop_reference_section(text: str) -> str:
    match = re.search(r"\n\s*(references|bibliography)\s*\n", text, flags=re.IGNORECASE)
    if not match:
        return text
    return text[: match.start()].strip()


def preprocess_text(raw_text: str) -> str:
    text = normalize_text(raw_text)
    text = remove_duplicate_lines(text)
    text = drop_reference_section(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

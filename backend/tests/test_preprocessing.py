from app.preprocessing import preprocess_text


def test_preprocess_text_normalizes_whitespace() -> None:
    text = "Title\r\n\r\n\r\nMethods\t\tsection"

    cleaned = preprocess_text(text)

    assert cleaned == "Title\n\nMethods section"


def test_preprocess_text_removes_repeated_short_lines() -> None:
    text = "Navigation\nNavigation\nNavigation\n\nMain paper content."

    cleaned = preprocess_text(text)

    assert "Navigation" not in cleaned
    assert "Main paper content." in cleaned

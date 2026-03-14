from app.services.semantic_chunker import semantic_chunk_text


def test_semantic_chunker_splits_and_bounds():
    text = (
        "Alpha section. " * 40
        + "\n\n"
        + "Beta section. " * 40
        + "\n\n"
        + "Gamma section. " * 40
    )

    chunks = semantic_chunk_text(text, target_chars=200, max_chars=260)
    assert len(chunks) >= 2
    assert all(len(c) <= 300 for c in chunks)


def test_semantic_chunker_handles_short_input():
    chunks = semantic_chunk_text("hello", target_chars=200, max_chars=260)
    assert chunks == ["hello"]


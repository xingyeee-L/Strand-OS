import re


def semantic_chunk_text(text: str, target_chars: int = 700, max_chars: int = 900) -> list[str]:
    if not text:
        return []

    normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not normalized:
        return []

    blocks = [b.strip() for b in re.split(r"\n{2,}", normalized) if b.strip()]

    chunks: list[str] = []
    buf = ""

    def flush():
        nonlocal buf
        if buf.strip():
            chunks.append(buf.strip())
        buf = ""

    for block in blocks:
        if len(block) > max_chars:
            sentences = [s.strip() for s in re.split(r"(?<=[。！？.!?])\s+|\n", block) if s.strip()]
            for s in sentences:
                if not buf:
                    buf = s
                elif len(buf) + 1 + len(s) <= target_chars:
                    buf = buf + " " + s
                else:
                    flush()
                    buf = s

                if len(buf) >= max_chars:
                    flush()
            continue

        if not buf:
            buf = block
        elif len(buf) + 2 + len(block) <= target_chars:
            buf = buf + "\n\n" + block
        else:
            flush()
            buf = block

        if len(buf) >= max_chars:
            flush()

    flush()
    return chunks


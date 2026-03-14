import json
import os
from dataclasses import dataclass
from pathlib import Path

from sqlmodel import Session, select

from app.config.database import engine, get_vector_store, search_knowledge_fragments_bm25
from app.config.llm_factory import get_llm
from app.models.schemas import KnowledgeFragment


@dataclass(frozen=True)
class EvalCase:
    id: str
    query: str
    expected_context_contains: list[str]
    expected_answer_contains: list[str]


def load_cases(dataset_path: str) -> list[EvalCase]:
    raw = dataset_path
    candidates = []
    candidates.append(Path(raw))
    candidates.append(Path.cwd() / raw)
    backend_root = Path(__file__).resolve().parents[2]
    candidates.append(backend_root / raw)
    if raw.startswith("backend/"):
        candidates.append(backend_root / raw.removeprefix("backend/"))

    path = next((p for p in candidates if p.exists()), candidates[0])
    items: list[EvalCase] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        raw = json.loads(line)
        items.append(
            EvalCase(
                id=str(raw.get("id") or raw.get("query") or len(items)),
                query=str(raw.get("query") or ""),
                expected_context_contains=list(raw.get("expected_context_contains") or []),
                expected_answer_contains=list(raw.get("expected_answer_contains") or []),
            )
        )
    return items


def _normalize_text(s: str) -> str:
    return (s or "").strip().lower()


def _contains_all(haystack: str, needles: list[str]) -> float:
    if not needles:
        return 1.0
    h = _normalize_text(haystack)
    hit = 0
    for n in needles:
        n2 = _normalize_text(n)
        if n2 and n2 in h:
            hit += 1
    return hit / max(1, len(needles))


def retrieve_context_fragments(
    query: str,
    session: Session,
    k_bm25: int = 4,
    k_vector: int = 2,
    fragment_types: list[str] | None = None,
) -> list[dict]:
    out: list[dict] = []

    try:
        bm25_hits = search_knowledge_fragments_bm25(
            query=query,
            limit=k_bm25,
            fragment_types=fragment_types or ["NOTE", "DISTILLED"],
        )
        for h in bm25_hits:
            out.append({"source": "bm25", **h})
    except Exception:
        pass

    if os.getenv("VECTOR_STORE_DISABLED", "").lower() in {"1", "true", "yes"}:
        return out

    try:
        docs = get_vector_store().similarity_search(query, k=k_vector)
        for d in docs:
            out.append(
                {
                    "source": "vector",
                    "content": d.page_content,
                    "source_file": d.metadata.get("source", "unknown"),
                    "fragment_type": d.metadata.get("fragment_type", "DISTILLED"),
                    "source_id": d.metadata.get("source_id"),
                    "score": None,
                }
            )
    except Exception:
        pass

    return out


def generate_answer(query: str, contexts: list[dict]) -> str:
    llm = get_llm()
    ctx = "\n\n".join([(c.get("content") or "")[:900] for c in contexts if (c.get("content") or "").strip()])
    prompt = f"""Answer the question using only the provided context. Be concise.

[Context]
{ctx}

[Question]
{query}
"""
    return llm.invoke(prompt).strip()


def evaluate_case(case: EvalCase, session: Session, llm_enabled: bool = False) -> dict:
    contexts = retrieve_context_fragments(case.query, session=session)
    context_text = "\n".join([(c.get("content") or "") for c in contexts])

    answer = ""
    if llm_enabled:
        answer = generate_answer(case.query, contexts)

    metrics = {
        "context_contains_recall": _contains_all(context_text, case.expected_context_contains),
        "answer_contains_recall": _contains_all(answer, case.expected_answer_contains) if llm_enabled else None,
        "contexts": len(contexts),
        "context_chars": len(context_text),
        "answer_chars": len(answer),
    }

    return {
        "id": case.id,
        "query": case.query,
        "metrics": metrics,
    }


def evaluate_dataset(
    dataset_path: str,
    llm_enabled: bool = False,
) -> dict:
    cases = load_cases(dataset_path)
    with Session(engine) as session:
        results = [evaluate_case(c, session=session, llm_enabled=llm_enabled) for c in cases]

    avg_context_recall = (
        sum((r["metrics"]["context_contains_recall"] or 0) for r in results) / max(1, len(results))
    )
    avg_answer_recall = None
    if llm_enabled:
        avg_answer_recall = sum((r["metrics"]["answer_contains_recall"] or 0) for r in results) / max(
            1, len(results)
        )

    return {
        "dataset": dataset_path,
        "llm_enabled": llm_enabled,
        "summary": {
            "cases": len(results),
            "avg_context_contains_recall": avg_context_recall,
            "avg_answer_contains_recall": avg_answer_recall,
        },
        "results": results,
    }


def seed_minimal_corpus(marker: str) -> None:
    with Session(engine) as session:
        source_file = f"NOTE:eval_seed:{marker}"
        exists = session.exec(
            select(KnowledgeFragment).where(KnowledgeFragment.source_file == source_file)
        ).first()
        if exists:
            return
        frag = KnowledgeFragment(
            content=f"Seed fragment for evaluation marker: {marker}",
            source_file=source_file,
            fragment_type="NOTE",
        )
        session.add(frag)
        session.commit()

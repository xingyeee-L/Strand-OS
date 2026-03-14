from sqlmodel import Session

from app.config.database import create_db_and_tables, engine
from app.eval.ragas_framework import evaluate_case, EvalCase, seed_minimal_corpus


def test_ragas_like_eval_offline_context_recall(tmp_path):
    create_db_and_tables()

    marker = "ragas_seed_marker_test_c7d9"
    seed_minimal_corpus(marker)

    case = EvalCase(
        id="t1",
        query=marker,
        expected_context_contains=[marker],
        expected_answer_contains=[],
    )

    with Session(engine) as session:
        result = evaluate_case(case, session=session, llm_enabled=False)

    assert result["metrics"]["context_contains_recall"] == 1.0

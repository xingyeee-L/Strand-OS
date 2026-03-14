import argparse
import json
import os
from pathlib import Path

from app.config.database import create_db_and_tables
from app.eval.ragas_framework import evaluate_dataset, seed_minimal_corpus


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--out", default="")
    parser.add_argument("--llm", action="store_true")
    parser.add_argument("--seed", action="store_true")
    args = parser.parse_args()

    create_db_and_tables()

    if args.seed:
        seed_minimal_corpus("ragas_seed_marker_1a2b")

    report = evaluate_dataset(args.dataset, llm_enabled=bool(args.llm))
    payload = json.dumps(report, ensure_ascii=False, indent=2)

    if args.out:
        Path(args.out).write_text(payload, encoding="utf-8")
    else:
        print(payload)

    if os.getenv("EVAL_FAIL_ON_LOW", "").lower() in {"1", "true", "yes"}:
        threshold = float(os.getenv("EVAL_MIN_CONTEXT_RECALL", "0.5"))
        if report["summary"]["avg_context_contains_recall"] < threshold:
            raise SystemExit(2)


if __name__ == "__main__":
    main()

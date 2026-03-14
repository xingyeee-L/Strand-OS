import os

from sqlmodel import Session

from app.config.database import engine, search_knowledge_fragments_bm25
from app.models.schemas import KnowledgeFragment, Source
from app.services.brain import BrainService


def test_bm25_search_and_hybrid_rag_context():
    os.environ["VECTOR_STORE_DISABLED"] = "1"

    marker = "quantum_pineapple_memory_marker_9f2a"

    with Session(engine) as session:
        src = Source(original_filename="unit_test.txt", content_type="text/plain", storage_uri="LOCAL:unit_test")
        session.add(src)
        session.flush()

        frag = KnowledgeFragment(
            content=f"This is a distilled fragment about {marker}. It should be retrievable by bm25 search.",
            source_file="NOTE:unit_test",
            fragment_type="NOTE",
            source_id=src.id,
        )
        session.add(frag)
        session.commit()

        hits = search_knowledge_fragments_bm25(query=marker, limit=3, fragment_types=["NOTE"])
        assert any(marker in (h.get("content") or "") for h in hits)

        ctx = BrainService.retrieve_rag_context(marker, session)
        assert marker in ctx

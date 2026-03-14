import os

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from sqlmodel import SQLModel, Session, create_engine

from app.config.settings import settings

os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
project_root = os.path.dirname(backend_dir)
DATA_DIR = os.path.join(project_root, "data")

if not os.path.exists(DATA_DIR):
    print(f"[WARN] Data dir {DATA_DIR} not found. Creating it.")
    os.makedirs(DATA_DIR, exist_ok=True)

SQLITE_PATH = os.path.join(DATA_DIR, "strand.db")
CHROMA_PATH = os.path.join(DATA_DIR, "chroma_db")
RAW_ARCHIVE_PATH = os.path.join(DATA_DIR, "raw_archive")
DISTILLED_BRAIN_PATH = os.path.join(DATA_DIR, "distilled_brain")

os.makedirs(RAW_ARCHIVE_PATH, exist_ok=True)
os.makedirs(DISTILLED_BRAIN_PATH, exist_ok=True)

print(f"[SYSTEM] Database Path: {SQLITE_PATH}")

sqlite_url = f"sqlite:///{SQLITE_PATH}"
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

_CLEANUP_USER_VERSION = 1300


def _sqlite_changes(conn) -> int:
    return int(conn.exec_driver_sql("SELECT changes()").scalar_one() or 0)


def _delete_and_count(conn, sql: str, params: tuple = ()) -> int:
    conn.exec_driver_sql(sql, params)
    return _sqlite_changes(conn)


def cleanup_test_artifacts(force: bool = False) -> dict:
    with engine.connect() as conn:
        current = int(conn.exec_driver_sql("PRAGMA user_version").scalar_one() or 0)
        if (not force) and current >= _CLEANUP_USER_VERSION:
            return {"status": "skipped", "user_version": current}

        total = 0
        deleted = {}

        conn.exec_driver_sql("BEGIN")
        try:
            deleted["missionlog"] = _delete_and_count(conn, "DELETE FROM missionlog")
            total += deleted["missionlog"]

            deleted["knowledgefragment_test_markers"] = _delete_and_count(
                conn,
                "DELETE FROM knowledgefragment WHERE content LIKE ? OR content LIKE ? OR source_file LIKE ?",
                ("%ragas_seed_marker_%", "%quantum_pineapple_memory_marker_%", "%unit_test%"),
            )
            total += deleted["knowledgefragment_test_markers"]

            deleted["knowledgefragment_demo_sources"] = _delete_and_count(
                conn,
                "DELETE FROM knowledgefragment WHERE source_id IN (SELECT id FROM source WHERE original_filename IN (?, ?))",
                ("demo.txt", "unit_test.txt"),
            )
            total += deleted["knowledgefragment_demo_sources"]

            deleted["source_demo"] = _delete_and_count(
                conn,
                "DELETE FROM source WHERE original_filename IN (?, ?) OR storage_uri LIKE ?",
                ("demo.txt", "unit_test.txt", "%unit_test%"),
            )
            total += deleted["source_demo"]

            deleted["knowledgefragment_orphan"] = _delete_and_count(
                conn,
                "DELETE FROM knowledgefragment WHERE source_id IS NOT NULL AND source_id NOT IN (SELECT id FROM source)",
            )
            total += deleted["knowledgefragment_orphan"]

            deleted["source_orphan"] = _delete_and_count(
                conn,
                "DELETE FROM source WHERE id NOT IN (SELECT DISTINCT source_id FROM knowledgefragment WHERE source_id IS NOT NULL)",
            )
            total += deleted["source_orphan"]

            conn.exec_driver_sql(f"PRAGMA user_version = {_CLEANUP_USER_VERSION}")
            conn.exec_driver_sql("COMMIT")
        except Exception:
            conn.exec_driver_sql("ROLLBACK")
            raise

        return {"status": "ok", "user_version": _CLEANUP_USER_VERSION, "deleted": deleted, "total": total}


def _migrate_sqlite_schema():
    with engine.connect() as conn:
        try:
            rows = conn.exec_driver_sql("PRAGMA table_info(knowledgefragment)").fetchall()
        except Exception:
            return

        existing = {r[1] for r in rows}
        if "fragment_type" not in existing:
            conn.exec_driver_sql("ALTER TABLE knowledgefragment ADD COLUMN fragment_type TEXT DEFAULT 'NOTE'")
        if "source_id" not in existing:
            conn.exec_driver_sql("ALTER TABLE knowledgefragment ADD COLUMN source_id INTEGER")
        conn.commit()


def _ensure_knowledgefragment_fts():
    with engine.connect() as conn:
        conn.exec_driver_sql(
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS knowledgefragment_fts
            USING fts5(
                content,
                source_file UNINDEXED,
                fragment_type UNINDEXED,
                source_id UNINDEXED,
                fragment_id UNINDEXED
            )
            """
        )

        conn.exec_driver_sql(
            """
            CREATE TRIGGER IF NOT EXISTS knowledgefragment_fts_ai
            AFTER INSERT ON knowledgefragment
            BEGIN
                INSERT INTO knowledgefragment_fts(rowid, content, source_file, fragment_type, source_id, fragment_id)
                VALUES (new.id, new.content, new.source_file, COALESCE(new.fragment_type, 'NOTE'), new.source_id, new.id);
            END;
            """
        )
        conn.exec_driver_sql(
            """
            CREATE TRIGGER IF NOT EXISTS knowledgefragment_fts_ad
            AFTER DELETE ON knowledgefragment
            BEGIN
                DELETE FROM knowledgefragment_fts WHERE rowid = old.id;
            END;
            """
        )
        conn.exec_driver_sql(
            """
            CREATE TRIGGER IF NOT EXISTS knowledgefragment_fts_au
            AFTER UPDATE ON knowledgefragment
            BEGIN
                DELETE FROM knowledgefragment_fts WHERE rowid = old.id;
                INSERT INTO knowledgefragment_fts(rowid, content, source_file, fragment_type, source_id, fragment_id)
                VALUES (new.id, new.content, new.source_file, COALESCE(new.fragment_type, 'NOTE'), new.source_id, new.id);
            END;
            """
        )

        conn.exec_driver_sql("DELETE FROM knowledgefragment_fts")
        conn.exec_driver_sql(
            """
            INSERT INTO knowledgefragment_fts(rowid, content, source_file, fragment_type, source_id, fragment_id)
            SELECT
                id,
                content,
                source_file,
                COALESCE(fragment_type, 'NOTE'),
                source_id,
                id
            FROM knowledgefragment
            """
        )
        conn.commit()


def search_knowledge_fragments_bm25(
    query: str,
    limit: int = 5,
    fragment_types: list[str] | None = None,
) -> list[dict]:
    if not query or not query.strip():
        return []

    q = query.strip()
    where_parts: list[str] = ["knowledgefragment_fts MATCH ?"]
    params: list[object] = [q]
    if fragment_types:
        placeholders = ", ".join(["?"] * len(fragment_types))
        where_parts.append(f"fragment_type IN ({placeholders})")
        params.extend(fragment_types)

    where = "WHERE " + " AND ".join(where_parts)

    sql = f"""
        SELECT
            fragment_id,
            source_file,
            fragment_type,
            source_id,
            content,
            bm25(knowledgefragment_fts) AS score
        FROM knowledgefragment_fts
        {where}
        ORDER BY score
        LIMIT ?
    """

    with engine.connect() as conn:
        rows = conn.exec_driver_sql(sql, tuple(params + [limit])).fetchall()
        return [
            {
                "fragment_id": r[0],
                "source_file": r[1],
                "fragment_type": r[2],
                "source_id": r[3],
                "content": r[4],
                "score": r[5],
            }
            for r in rows
        ]


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    _migrate_sqlite_schema()
    _ensure_knowledgefragment_fts()
    cleanup_test_artifacts(force=False)


def get_session():
    with Session(engine) as session:
        yield session


_vector_store = None


def get_vector_store():
    global _vector_store
    if _vector_store is None:
        if settings.VECTOR_STORE_DISABLED:
            class _DummyVectorStore:
                def add_documents(self, documents=None, ids=None, **kwargs):
                    return []

                def similarity_search(self, query, k=4, **kwargs):
                    return []

                def similarity_search_with_score(self, query, k=4, **kwargs):
                    return []

            _vector_store = _DummyVectorStore()
            return _vector_store

        print("[SYSTEM] Loading Embedding Model...")
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        _vector_store = Chroma(
            collection_name="strand_knowledge",
            embedding_function=embeddings,
            persist_directory=CHROMA_PATH,
        )
    return _vector_store

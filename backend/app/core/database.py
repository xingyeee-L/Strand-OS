import os
from sqlmodel import SQLModel, create_engine, Session
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'

# --- 🔥 [关键修复] 路径校准 ---
# 目标：指向 Strand/data (项目根目录下的 data)
# 无论是在 backend 目录下运行 uvicorn，还是在根目录运行，都要找对。

# 1. 获取 backend 目录
# __file__ = .../backend/app/core/database.py
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 2. 获取项目根目录 (Strand/)
project_root = os.path.dirname(backend_dir)

# 3. 拼接 data 目录
DATA_DIR = os.path.join(project_root, "data")

# 确保它存在
if not os.path.exists(DATA_DIR):
    # 兜底：万一算错了（比如 backend 就是根），就在当前目录下找
    # 或者打印警告
    print(f"[WARN] Data dir {DATA_DIR} not found. Creating it.")
    os.makedirs(DATA_DIR, exist_ok=True)

SQLITE_PATH = os.path.join(DATA_DIR, "strand.db")
CHROMA_PATH = os.path.join(DATA_DIR, "chroma_db")

print(f"[SYSTEM] Database Path: {SQLITE_PATH}")

# --- SQL 配置 ---
sqlite_url = f"sqlite:///{SQLITE_PATH}"
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# --- 向量库配置 ---
_vector_store = None
def get_vector_store():
    global _vector_store
    if _vector_store is None:
        print("[SYSTEM] Loading Embedding Model...")
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        _vector_store = Chroma(
            collection_name="strand_knowledge",
            embedding_function=embeddings,
            persist_directory=CHROMA_PATH
        )
    return _vector_store
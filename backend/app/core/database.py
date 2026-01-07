import os  # <--- 1. 确保必须导入 os
from sqlmodel import SQLModel, create_engine, Session
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'
# 配置常量
SQLITE_FILE = "sqlite:///../data/strand.db"
CHROMA_PATH = "../data/chroma_db"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# 1. SQL 引擎
engine = create_engine(SQLITE_FILE)

# 2. 向量模型 (单例，避免重复加载)
_embed_fn = None
def get_embedding_function():
    global _embed_fn
    if _embed_fn is None:
        print("[SYSTEM] Loading Embedding Model...")
        _embed_fn = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    return _embed_fn

# 3. 向量库连接
def get_vector_store():
    return Chroma(
        collection_name="strand_vectors",
        embedding_function=get_embedding_function(),
        persist_directory=CHROMA_PATH
    )

# 4. 依赖注入 (Dependency Injection)
def get_session():
    with Session(engine) as session:
        yield session
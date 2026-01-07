import os
import sys
import shutil
import json
from datetime import date
from sqlmodel import Session, SQLModel, create_engine
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

# --- 关键：将当前目录加入 Python 路径，以便导入 app 模块 ---
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 导入新架构的模块
from app.models.schemas import WordNode, UserProfile, MissionLog, NeuralLink, KnowledgeFragment
from app.services.brain import BrainService

# --- 配置 ---
SQLITE_FILE = "sqlite:///../data/strand.db"
CHROMA_PATH = "../data/chroma_db"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# 种子数据
INITIAL_WORDS = [
    "fernweh", "wanderlust", "heimweh", 
    "adapt", "adopt", "adept", 
    "bridge", "strand", "connection", 
    "entropy", "chaos", "order",
    "introduction", "reduce", "production"
]

def init_database():
    print("--- [Strand v3.0] 系统重铸 (Modular Architecture) ---")

    # 1. 清理旧数据
    if os.path.exists("../data/strand.db"):
        os.remove("../data/strand.db")
        print("[INFO] 已清理旧 SQLite 数据库")
    if os.path.exists(CHROMA_PATH):
        shutil.rmtree(CHROMA_PATH)
        print("[INFO] 已清理旧向量索引")
    
    os.makedirs("../data", exist_ok=True)

    # 2. 初始化引擎
    print("[INFO] 正在初始化数据库引擎...")
    engine = create_engine(SQLITE_FILE)
    SQLModel.metadata.create_all(engine)

    print(f"[INFO] 初始化向量模型: {EMBEDDING_MODEL}...")
    embed_fn = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    vector_store = Chroma(
        collection_name="strand_vectors",
        embedding_function=embed_fn,
        persist_directory=CHROMA_PATH
    )

    with Session(engine) as session:
        # 3. 创建用户
        print("[INFO] 创建默认指挥官档案...")
        user = UserProfile(
            id=1, 
            username="Commander", 
            level=1, 
            current_xp=0, 
            next_level_xp=500
        )
        session.add(user)

        # 4. 创建任务
        print("[INFO] 生成今日战术订单...")
        mission = MissionLog(
            date=str(date.today()),
            type="MAIN",
            target_words=json.dumps(["fernweh", "bridge", "entropy"]),
            xp_reward=300
        )
        session.add(mission)

        # 5. 批量处理种子单词 (调用 BrainService)
        print(f"[INFO] 正在通过 BrainService 处理 {len(INITIAL_WORDS)} 个据点...")
        chroma_docs = []
        
        for i, word in enumerate(INITIAL_WORDS):
            print(f"  > 处理: {word}...")
            
            # 🔥 直接复用 Service 里的逻辑，保证和 API 行为一致
            # 注意：传入 index=i 以触发网格抖动算法的螺旋分布
            coords = BrainService.generate_distributed_coordinates(word, index=i)
            definition = BrainService.fetch_smart_definition(word)
            ety = BrainService.analyze_etymology(word)
            
            # 发音编码依然可以在这里算，或者封装进 Service，这里简单处理
            from metaphone import doublemetaphone
            p_code = doublemetaphone(word)[0]
            
            node = WordNode(
                id=word,
                content=definition,
                etymology=ety,
                phonetic_code=p_code,
                mastery_level=0 
            )
            session.add(node)
            chroma_docs.append(Document(page_content=word, metadata={"id": word}))

        session.commit()
        
        if chroma_docs:
            vector_store.add_documents(chroma_docs)

    print("\n[SUCCESS] 重构版系统初始化完成。")
    print("现在可以启动 uvicorn 了。")

if __name__ == "__main__":
    init_database()
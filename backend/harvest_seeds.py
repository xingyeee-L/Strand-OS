import re
import uuid
import json
from sqlmodel import Session, select
from langchain_core.documents import Document
from app.config.database import create_db_and_tables, engine, get_vector_store
from app.models.schemas import WordNode
from app.services.brain import BrainService
from metaphone import doublemetaphone

def harvest():
    print("🚜 [HARVEST] Starting Data Ingestion...")
    create_db_and_tables()
    vector_store = get_vector_store()
    
    # 正则表达式：匹配 "单词 [音标] 释义" 格式
    # 兼容 a (an), able [音标], 以及多重释义
    pattern = re.compile(r'^([a-zA-Z\s\-\/\(\)\.]+)\s+\[.*\]\s+(.*)$')

    nodes_to_add = []
    docs_to_vectorize = []
    ids_to_vectorize = []

    try:
        with open("raw_vocab.txt", "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        print(f"📖 [HARVEST] Read {len(lines)} lines from raw file.")

        for line in lines:
            line = line.strip()
            if not line or len(line) < 3: continue
            
            match = pattern.match(line)
            if match:
                raw_word = match.group(1).strip()
                definition = match.group(2).strip()
                
                # 处理 a (an) 这种特殊情况，取第一个有效单词
                clean_word = raw_word.split('(')[0].split('/')[0].strip().lower()
                
                # 再次过滤非法字符
                clean_word = re.sub(r'[^a-z\-]', '', clean_word)
                if not clean_word: continue

                # 构造节点数据
                node = WordNode(
                    id=clean_word,
                    content=definition,
                    phonetic_code=doublemetaphone(clean_word)[0],
                    mastery_level=1, # 标记为基础词汇
                    etymology='{"lang":"EN", "roots":[], "prefixes":[], "suffixes":[]}'
                )
                nodes_to_add.append(node)
                
                # 构造向量数据
                doc = Document(
                    page_content=clean_word,
                    metadata={"source": "seed", "definition": definition}
                )
                docs_to_vectorize.append(doc)
                ids_to_vectorize.append(str(uuid.uuid4()))

        # 批量保存到 SQLite
        with Session(engine) as session:
            print(f"📝 [HARVEST] Saving {len(nodes_to_add)} nodes to SQLite...")
            for node in nodes_to_add:
                # 避免重复
                existing = session.get(WordNode, node.id)
                if not existing:
                    session.add(node)
            session.commit()

        # 批量保存到 ChromaDB
        if docs_to_vectorize:
            print(f"🧠 [HARVEST] Vectorizing {len(docs_to_vectorize)} nodes...")
            batch_size = 100
            for i in range(0, len(docs_to_vectorize), batch_size):
                batch_docs = docs_to_vectorize[i : i + batch_size]
                batch_ids = ids_to_vectorize[i : i + batch_size]
                vector_store.add_documents(documents=batch_docs, ids=batch_ids)
                print(f"   进度: {i + len(batch_docs)} / {len(docs_to_vectorize)}")

        print("✨ [SUCCESS] 基准词库构建完成。Strand OS 基础文明已建立。")

    except FileNotFoundError:
        print("❌ 错误：请先创建 raw_vocab.txt 并放入单词表文本。")
    except Exception as e:
        print(f"❌ 运行出错: {e}")

if __name__ == "__main__":
    harvest()

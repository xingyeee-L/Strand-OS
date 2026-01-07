import sqlite3
import os

def run_migration():
    # 🔥 精确指向根目录 data 文件夹下的 strand.db
    # 如果你在 backend 目录下运行，路径是 ../data/strand.db
    db_path = os.path.join("..", "data", "strand.db")
    
    if not os.path.exists(db_path):
        print(f"❌ 错误：在 {db_path} 未找到数据库文件！")
        print("请确认你在 backend 目录下运行此脚本，或者手动修改 db_path。")
        return

    print(f"🛠️ 正在对 {db_path} 执行结构升级...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 1. 检查 knowledgefragment 表结构
        cursor.execute("PRAGMA table_info(knowledgefragment)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if "embedding_id" not in columns:
            print("➕ 正在添加 [embedding_id] 字段...")
            # 增加这一列，用于和 ChromaDB 的 ID 强绑定
            cursor.execute("ALTER TABLE knowledgefragment ADD COLUMN embedding_id VARCHAR")
            print("✅ 字段添加成功。")
        else:
            print("ℹ️ [embedding_id] 字段已存在，跳过。")

        conn.commit()
        print("🚀 数据库升级完成，旧数据已保留。")
    except Exception as e:
        print(f"❌ 手术失败: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
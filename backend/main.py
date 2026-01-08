from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import create_db_and_tables
from app.api.endpoints import router
# 🔥 [至关重要]：必须在这里导入 schemas！
# 只有导入了，SQLModel 才知道有哪些表需要创建。
# 即使代码里没用到它，也必须导进来。
from app.models import schemas 

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- 启动时执行 ---
    print("[SYSTEM] Initializing Database Schema...")
    create_db_and_tables() # 🔥 自动创建所有表 (WordNode, MissionLog, etc.)
    print("[SYSTEM] Database Ready.")
    yield
    # --- 关闭时执行 (可选) ---

app = FastAPI(title="Strand OS Brain", lifespan=lifespan)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载路由
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
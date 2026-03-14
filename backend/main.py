from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config.database import create_db_and_tables
from app.config.settings import settings
from app.config.logging import setup_logging
from app.middleware.cors import configure_cors
from app.routes.api import router
# 🔥 [至关重要]：必须在这里导入 schemas！
# 只有导入了，SQLModel 才知道有哪些表需要创建。
# 即使代码里没用到它，也必须导进来。
from app.models import schemas 

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- 启动时执行 ---
    setup_logging()
    print(f"[SYSTEM] Initializing {settings.APP_NAME} v{settings.VERSION}...")
    create_db_and_tables() # 🔥 自动创建所有表 (WordNode, MissionLog, etc.)
    print("[SYSTEM] Database Ready.")
    yield
    # --- 关闭时执行 (可选) ---

app = FastAPI(title=settings.APP_NAME, version=settings.VERSION, lifespan=lifespan)

configure_cors(app)

# 挂载路由
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 导入你的业务模块
from app.config.database import create_db_and_tables
from app.routes.api import router
from app.models import schemas # 必须导入以注册 SQLModel 表
from app.config.settings import settings

# 1. 先定义 lifespan 函数
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- 启动时 ---
    print(f"[SYSTEM] Initializing {settings.APP_NAME} v{settings.VERSION}...")
    create_db_and_tables() 
    print("[SYSTEM] Database Ready.")
    yield
    # --- 关闭时 ---

# 2. 再实例化 FastAPI，传入定义好的 lifespan
app = FastAPI(
    title=settings.APP_NAME, 
    version=settings.VERSION, 
    lifespan=lifespan
)

# 3. 配置 CORS
allow_all_origins = "*" in settings.ALLOWED_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=False if allow_all_origins else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. 挂载路由
app.include_router(router)

# 5. 启动入口
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

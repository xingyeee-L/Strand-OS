from fastapi import APIRouter

from app.controllers.v1.agent import router as agent_router
from app.controllers.v1.graph import router as graph_router
from app.controllers.v1.knowledge import router as knowledge_router
from app.controllers.v1.mission import router as mission_router
from app.controllers.v1.user import router as user_router

router = APIRouter()

router.include_router(graph_router)
router.include_router(knowledge_router)
router.include_router(mission_router)
router.include_router(user_router)
router.include_router(agent_router)

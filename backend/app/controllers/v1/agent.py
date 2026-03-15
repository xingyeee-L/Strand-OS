import json
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config.llm_factory import get_llm
from app.config.settings import settings

router = APIRouter()

DEFAULT_AGENT_SYSTEM_PROMPT = """你是 Strand OS 的战术 AI 助手（代号：SC-7274）。

角色与目标：
- 作为用户的智能副驾驶，为知识图谱探索、词汇学习、任务推进、笔记整理提供建议与执行步骤。
- 优先给出可操作的下一步；当信息不足时，用最少的问题补齐关键上下文。

语气与风格：
- 冷静、专业、简洁，具有“主控台/飞船系统”风格但不戏剧化。
- 输出以要点为主，避免长篇空话。

行为边界：
- 不编造事实；不确定时明确说明并给出验证方法或替代方案。
- 不输出或索取敏感信息（密钥、token、密码）；不引导用户泄露隐私。
- 不提供违法、有害或危险操作的具体执行指导。
- 不假装能够访问本机文件、网络或外部系统；仅基于用户输入与当前对话内容回答。

交互规则：
- 跟随用户语言（中文/英文）回复。
- 如用户提出代码/配置类问题：给出步骤 + 关键片段；默认不输出冗余注释。
"""


def build_chat_prompt(user_text: str) -> str:
    sys_prompt = (settings.AGENT_SYSTEM_PROMPT or DEFAULT_AGENT_SYSTEM_PROMPT).strip()
    user_text = (user_text or "").strip()
    return f"System:\n{sys_prompt}\n\nUser:\n{user_text}\n\nAssistant:\n"


class VisionAnalyzeRequest(BaseModel):
    image_base64: str
    text: Optional[str] = "请分析这张图谱截图，识别关键节点并给出下一步探索建议。"


class VisionAnalyzeResponse(BaseModel):
    summary: str
    suggestions: List[str]
    detected_nodes: Optional[List[str]] = []


@router.post("/agent/vision_analyze", response_model=VisionAnalyzeResponse)
async def vision_analyze(req: VisionAnalyzeRequest):
    if not req.image_base64:
        raise HTTPException(status_code=422, detail="Missing image_base64")

    if len(req.image_base64) > 2 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large")

    llm = get_llm()
    prompt = f"""
    作为 Strand OS 的战术 AI (SC-7274)，分析此图谱截图。
    用户指令: {req.text}

    请以 JSON 格式输出分析结果，包含：
    1) summary: 一句话总结当前图谱状态。
    2) suggestions: 3条具体的下一步探索建议。
    3) detected_nodes: 识别到的主要单词节点列表。

    输出示例:
    {{"summary": "...", "suggestions": ["...", "..."], "detected_nodes": ["...", "..."]}}
    """

    try:
        response_text = llm.invoke(prompt, image_b64=req.image_base64)
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "{" in response_text:
            response_text = response_text[response_text.find("{") : response_text.rfind("}") + 1]

        data = json.loads(response_text)
        return VisionAnalyzeResponse(**data)
    except Exception as e:
        msg = str(e)
        print(f"[Vision Error] {msg}")
        if ("RESOURCE_EXHAUSTED" in msg) or ("429" in msg) or ("quota" in msg.lower()):
            raise HTTPException(status_code=429, detail="Gemini 配额不足/已用尽，视觉分析暂不可用。")
        raise HTTPException(status_code=500, detail=f"Vision analysis failed: {msg}")


class ChatRequest(BaseModel):
    text: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str


@router.post("/agent/chat", response_model=ChatResponse)
async def agent_chat(req: ChatRequest):
    if not req.text:
        raise HTTPException(status_code=422, detail="Missing text")

    llm = get_llm()
    try:
        response = llm.invoke(build_chat_prompt(req.text))
        return ChatResponse(response=response)
    except Exception as e:
        msg = str(e)
        if ("RESOURCE_EXHAUSTED" in msg) or ("429" in msg) or ("quota" in msg.lower()):
            raise HTTPException(status_code=429, detail="Gemini 配额不足/已用尽，请稍后再试或切换本地 Ollama。")
        raise HTTPException(status_code=500, detail=f"Chat failed: {msg}")

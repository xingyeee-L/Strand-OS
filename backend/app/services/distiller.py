import re

from app.config.llm_factory import get_llm
from app.config.settings import settings


def distill_text(text: str) -> str:
    mode = settings.DISTILL_MODE.lower().strip()
    cleaned = re.sub(r"\s+", " ", (text or "").strip())
    if not cleaned:
        return ""

    if mode in {"off", "raw"}:
        return cleaned

    if mode in {"llm", "model"}:
        llm = get_llm()
        prompt = f"""
        你是企业级知识蒸馏引擎。
        将下方内容蒸馏为适合检索增强生成 (RAG) 的“原子化知识点”，要求：
        1) 输出严格为 Markdown 列表（每行以 "- " 开头），禁止标题/解释/前后缀。
        2) 数量控制：输入较长时输出 5-12 条；输入过短时返回 3-5 条，并显式补全上下文（仍保持要点风格）。
        3) 每条 1-2 句，保留专有名词/数字/公式符号。
        4) 仅输出列表内容，不要任何 Markdown 以外的文字。
        内容：
        {cleaned}
        """
        raw_output = llm.invoke(prompt, stop=["\n\n"]).strip()
        
        # 后置过滤：确保每一行都以 "- " 开头
        lines = [line.strip() for line in raw_output.splitlines() if line.strip()]
        valid_lines = [line if line.startswith("- ") else f"- {line}" for line in lines]
        
        return "\n".join(valid_lines) or cleaned

    sentences = re.split(r"(?<=[。！？.!?])\s+", cleaned)
    kept = [s for s in sentences if s][:8]
    distilled = "\n".join(f"- {s.strip()}" for s in kept)
    return distilled if distilled.strip() else cleaned

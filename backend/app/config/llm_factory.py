from abc import ABC, abstractmethod
import base64
import logging
from typing import Iterable, Optional

from app.config.settings import settings


logger = logging.getLogger(__name__)


class BaseLLMProvider(ABC):
    @abstractmethod
    def invoke(
        self, prompt: str, stop: Optional[Iterable[str]] = None, image_b64: Optional[str] = None
    ) -> str:
        raise NotImplementedError


class OllamaProvider(BaseLLMProvider):
    def __init__(self):
        model = settings.OLLAMA_MODEL
        base_url = settings.OLLAMA_BASE_URL
        timeout = settings.OLLAMA_TIMEOUT
        try:
            from langchain_ollama import OllamaLLM as Ollama
        except ImportError:
            from langchain_community.llms import Ollama
        self._llm = Ollama(model=model, base_url=base_url, timeout=timeout)

    def invoke(
        self, prompt: str, stop: Optional[Iterable[str]] = None, image_b64: Optional[str] = None
    ) -> str:
        if stop is None:
            return self._llm.invoke(prompt)
        return self._llm.invoke(prompt, stop=list(stop))


class GeminiProvider(BaseLLMProvider):
    def __init__(self):
        api_key = settings.GOOGLE_API_KEY or settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not set for GeminiProvider")

        model = settings.GEMINI_MODEL
        temperature = settings.GEMINI_TEMPERATURE
        self._model = model

        try:
            from google import genai
            from google.genai import types
        except Exception as e:
            raise ImportError("Please install 'google-genai' to use GeminiProvider") from e

        self._types = types
        self._client = genai.Client(api_key=api_key)
        self._temperature = temperature

    def invoke(
        self, prompt: str, stop: Optional[Iterable[str]] = None, image_b64: Optional[str] = None
    ) -> str:
        cfg_kwargs = {"temperature": self._temperature}
        if stop:
            cfg_kwargs["stop_sequences"] = [s for s in stop if s]
        config = self._types.GenerateContentConfig(**cfg_kwargs)

        if not image_b64:
            resp = self._client.models.generate_content(model=self._model, contents=prompt, config=config)
            return (getattr(resp, "text", None) or "").strip()

        img_bytes = base64.b64decode(image_b64)
        parts = [
            self._types.Part.from_text(prompt),
            self._types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
        ]
        contents = [self._types.Content(role="user", parts=parts)]
        resp = self._client.models.generate_content(model=self._model, contents=contents, config=config)
        return (getattr(resp, "text", None) or "").strip()


class ResilientProvider(BaseLLMProvider):
    def __init__(self, primary: BaseLLMProvider, fallback: BaseLLMProvider):
        self._primary = primary
        self._fallback = fallback

    def invoke(
        self, prompt: str, stop: Optional[Iterable[str]] = None, image_b64: Optional[str] = None
    ) -> str:
        try:
            return self._primary.invoke(prompt, stop=stop, image_b64=image_b64)
        except Exception as e:
            msg = str(e)
            quota = ("RESOURCE_EXHAUSTED" in msg) or ("429" in msg) or ("quota" in msg.lower())
            if quota:
                if image_b64:
                    raise
                try:
                    logger.warning(f"Google LLM 调用失败（配额耗尽/超限），正在转用本地 LLM 兜底: {msg}")
                    return self._fallback.invoke(prompt, stop=stop)
                except Exception as e2:
                    logger.error(f"本地 LLM 兜底调用也失败: {str(e2)}")
                    return f"模型暂不可用：{str(e2)}"
            raise


_provider: Optional[BaseLLMProvider] = None


def get_llm() -> BaseLLMProvider:
    global _provider
    if _provider is not None:
        return _provider

    llm_type = settings.LLM_TYPE.lower().strip()
    if llm_type in {"gemini", "google"}:
        fallback = OllamaProvider()
        try:
            _provider = ResilientProvider(primary=GeminiProvider(), fallback=fallback)
        except Exception as e:
            logger.error(f"GeminiProvider 初始化失败，强制降级为 Ollama: {str(e)}")
            _provider = fallback
    else:
        _provider = OllamaProvider()
    return _provider

from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Strand OS Brain"
    VERSION: str = "1.2.0"
    DEBUG: bool = False

    ALLOWED_ORIGINS: List[str] = ["*"]

    LLM_TYPE: str = "gemini"

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"
    OLLAMA_TIMEOUT: float = 120.0

    GOOGLE_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-pro"
    GEMINI_TEMPERATURE: float = 0.2
    GEMINI_TIMEOUT: float = 60.0

    VECTOR_STORE_DISABLED: bool = False
    DISTILL_MODE: str = "heuristic"
    SEMANTIC_CHUNKING: bool = False

    GCS_BUCKET: Optional[str] = None
    GCS_PREFIX: str = "raw_archive"
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None

    AGENT_SYSTEM_PROMPT: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()

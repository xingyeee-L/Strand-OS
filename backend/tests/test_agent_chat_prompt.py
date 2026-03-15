from app.config import llm_factory
from fastapi.testclient import TestClient

from main import app


class _DummyLLM:
    def invoke(self, prompt: str, stop=None, image_b64=None) -> str:
        return prompt


def test_agent_chat_includes_system_prompt():
    prev = llm_factory._provider
    llm_factory._provider = _DummyLLM()
    try:
        client = TestClient(app)
        res = client.post("/agent/chat", json={"text": "hello"})
        assert res.status_code == 200
        body = res.json()
        assert "System:" in body["response"]
        assert "SC-7274" in body["response"]
        assert "User:" in body["response"]
        assert "hello" in body["response"]
        assert "Assistant:" in body["response"]
    finally:
        llm_factory._provider = prev


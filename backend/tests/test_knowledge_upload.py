import os

from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_knowledge_upload_txt_distilled_file_created(tmp_path):
    os.environ["VECTOR_STORE_DISABLED"] = "1"
    os.environ["DISTILL_MODE"] = "heuristic"

    content = b"Strand OS is a knowledge graph system. It uses RAG and SRS."
    files = {"file": ("sample.txt", content, "text/plain")}

    response = client.post("/knowledge/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["chunks"] >= 1
    assert "distilled_path" in data
    assert os.path.exists(data["distilled_path"])

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"
    assert "Strand OS Brain" in response.json()["system"]

def test_search_hints_empty():
    response = client.get("/search/hints?q=a")
    assert response.status_code == 200
    assert response.json() == []

def test_user_profile():
    response = client.get("/user/profile")
    assert response.status_code == 200
    assert "username" in response.json()
    assert response.json()["username"] == "Sam"

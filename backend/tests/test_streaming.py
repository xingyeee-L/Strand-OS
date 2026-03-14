from fastapi.testclient import TestClient

from main import app


def test_link_stream_sse_protocol():
    client = TestClient(app)

    with client.stream(
        "POST",
        "/link/stream",
        json={"source_id": "a", "target_id": "b", "type": "auto", "action": "delete"},
    ) as r:
        assert r.status_code == 200
        ctype = r.headers.get("content-type", "")
        assert "text/event-stream" in ctype

        body = ""
        for chunk in r.iter_text():
            body += chunk
            if '"type": "result"' in body:
                break

        assert "data:" in body
        assert '"type": "meta"' in body
        assert '"type": "delta"' in body or '"type": "result"' in body
        assert '"type": "result"' in body


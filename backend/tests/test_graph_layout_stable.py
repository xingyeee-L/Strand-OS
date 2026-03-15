import json

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.config.database import create_db_and_tables, engine
from app.models.schemas import NeuralLink, WordNode
from app.services.brain import BrainService
from main import app


def test_graph_context_neighbor_positions_stable(monkeypatch: pytest.MonkeyPatch):
    create_db_and_tables()

    with Session(engine) as session:
        target = "strand"
        n1 = "alpha"
        n2 = "zulu"

        for wid in [target, n1, n2]:
            node = session.get(WordNode, wid)
            if not node:
                session.add(
                    WordNode(
                        id=wid,
                        content=f"def:{wid}",
                        phonetic_code=wid,
                        mastery_level=0,
                    )
                )

        session.add(
            NeuralLink(
                source_id=target,
                target_id=n2,
                link_type="auto",
                narrative="n2",
            )
        )
        session.add(
            NeuralLink(
                source_id=target,
                target_id=n1,
                link_type="auto",
                narrative="n1",
            )
        )
        session.commit()

    monkeypatch.setattr(BrainService, "scan_network_logic", lambda *args, **kwargs: {})

    client = TestClient(app)
    r1 = client.post("/graph/context", json={"word": "strand"})
    r2 = client.post("/graph/context", json={"word": "strand"})
    assert r1.status_code == 200
    assert r2.status_code == 200

    j1 = r1.json()
    j2 = r2.json()

    p1 = {n["id"]: n.get("position") for n in j1.get("neighbors", [])}
    p2 = {n["id"]: n.get("position") for n in j2.get("neighbors", [])}

    assert p1.get("alpha") is not None
    assert p1.get("zulu") is not None
    assert json.dumps(p1, sort_keys=True) == json.dumps(p2, sort_keys=True)


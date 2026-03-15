import json
from datetime import date
from typing import Any, Dict, List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from rapidfuzz import fuzz
from sqlmodel import Session, select

from app.config.database import get_session
from app.models.schemas import (
    KnowledgeFragment,
    LinkRequest,
    LinkResultDTO,
    MissionLog,
    NeuralLink,
    NodeDTO,
    ScanRequest,
    UserProfile,
    WordNode,
)
from app.services.brain import BrainService
from metaphone import doublemetaphone


class GraphContextDTO(BaseModel):
    center: NodeDTO
    neighbors: List[Dict[str, Any]]


router = APIRouter()


@router.get("/")
def health_check():
    return {"status": "online", "system": "Strand OS Brain", "version": "v1.1"}


@router.post("/graph/context", response_model=GraphContextDTO)
def get_graph_context(request: ScanRequest, session: Session = Depends(get_session)):
    target = request.word.lower().strip()
    center_node = session.get(WordNode, target)

    is_hollow = not center_node or not center_node.content or "SIGNAL LOST" in center_node.content

    if is_hollow:
        definition = request.definition or BrainService.fetch_smart_definition(target)

        if not center_node:
            center_node = WordNode(
                id=target,
                content=definition,
                phonetic_code=doublemetaphone(target)[0],
                mastery_level=0,
            )
        else:
            center_node.content = definition

        session.add(center_node)
        session.commit()
        session.refresh(center_node)

    note_source = f"NOTE:{target}"
    note_frag = session.exec(select(KnowledgeFragment).where(KnowledgeFragment.source_file == note_source)).first()
    current_note = note_frag.content if note_frag else None

    scan_data = BrainService.scan_network_logic(target, session)

    existing_links = session.exec(
        select(NeuralLink).where((NeuralLink.source_id == target) | (NeuralLink.target_id == target))
    ).all()

    neighbors_map: Dict[str, Dict[str, Any]] = {}

    for link in existing_links:
        neighbor_id = link.target_id if link.source_id == target else link.source_id
        node = session.get(WordNode, neighbor_id)
        if node:
            neighbors_map[neighbor_id] = {
                "id": neighbor_id,
                "content": node.content,
                "relation": link.link_type,
                "is_linked": True,
                "narrative": link.narrative,
                "mastery_level": node.mastery_level,
            }

    for type_name, ids in scan_data.items():
        for nid in ids:
            if nid.startswith("NOTE:"):
                continue
            if nid not in neighbors_map:
                node = session.get(WordNode, nid)
                if node:
                    neighbors_map[nid] = {
                        "id": nid,
                        "content": node.content,
                        "relation": type_name,
                        "is_linked": False,
                        "narrative": None,
                        "mastery_level": node.mastery_level,
                    }

    final_neighbors = []
    for idx, nid in enumerate(sorted(neighbors_map.keys())):
        data = neighbors_map[nid]
        coord_json = BrainService.generate_distributed_coordinates(nid, idx)
        n_dict = data.copy()
        n_dict["position"] = json.loads(coord_json)
        final_neighbors.append(n_dict)

    today_str = str(date.today())
    missions = session.exec(select(MissionLog).where(MissionLog.date == today_str)).all()
    target_ids = set()
    for m in missions:
        try:
            target_ids.update(json.loads(m.target_words))
        except Exception:
            pass

    is_reviewed_today = False
    if center_node.last_review and center_node.last_review.date() == date.today():
        is_reviewed_today = True

    return GraphContextDTO(
        center=NodeDTO(
            id=center_node.id,
            content=center_node.content,
            mastery_level=center_node.mastery_level,
            is_mission_target=(center_node.id in target_ids),
            is_reviewed_today=is_reviewed_today,
            note=current_note,
            position=None,
        ),
        neighbors=final_neighbors,
    )


@router.post("/node/deep_scan")
def deep_scan_node(request: ScanRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    target = request.word.lower().strip()
    background_tasks.add_task(BrainService.run_deep_scan_task, target)
    return {"status": "processing", "message": f"Odradek scan initiated for {target}"}


@router.get("/search/hints")
def search_hints(q: str, session: Session = Depends(get_session)):
    if not q or len(q) < 2:
        return []
    q_str = q.lower().strip()

    local_hits = session.exec(select(WordNode).where(WordNode.id.like(f"{q_str}%")).limit(5)).all()
    results = []
    local_defs_map: Dict[str, List[str]] = {}

    for node in local_hits:
        results.append(
            {
                "word": node.id,
                "lang": "LOCAL",
                "definition": node.content[:30] + "...",
                "source": "MEMORY",
            }
        )
        if node.id.lower() not in local_defs_map:
            local_defs_map[node.id.lower()] = []
        local_defs_map[node.id.lower()].append(node.content)

    cloud_hits = BrainService.composite_search(q_str)
    for hit in cloud_hits:
        w_lower = hit["word"].lower()
        should_show = True
        if w_lower in local_defs_map:
            for local_def in local_defs_map[w_lower]:
                if fuzz.partial_ratio(hit["definition"], local_def) > 70:
                    should_show = False
                    break
        if should_show:
            results.append(hit)

    return results


@router.delete("/node/{node_id}")
def delete_node(node_id: str, session: Session = Depends(get_session)):
    node_id = node_id.lower().strip()
    node = session.get(WordNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Not found")

    links_source = session.exec(select(NeuralLink).where(NeuralLink.source_id == node_id)).all()
    for link in links_source:
        session.delete(link)
    links_target = session.exec(select(NeuralLink).where(NeuralLink.target_id == node_id)).all()
    for link in links_target:
        session.delete(link)

    session.delete(node)
    session.commit()
    return {"status": "voidout_complete", "target": node_id}


@router.post("/link", response_model=LinkResultDTO)
def handle_link_action(req: LinkRequest, session: Session = Depends(get_session)):
    existing = session.exec(
        select(NeuralLink).where(
            ((NeuralLink.source_id == req.source_id) & (NeuralLink.target_id == req.target_id))
            | ((NeuralLink.source_id == req.target_id) & (NeuralLink.target_id == req.source_id))
        )
    ).first()

    user = session.get(UserProfile, 1)
    if not user:
        user = UserProfile(id=1, username="Sam", level=1, current_xp=0, next_level_xp=100)
        session.add(user)

    if req.action == "regenerate" and existing:
        search_query = f"{req.source_id} {req.target_id}"
        rag_context = BrainService.retrieve_rag_context(search_query, session)
        new_narrative = BrainService.generate_narrative(req.source_id, req.target_id, req.type, rag_context)
        existing.narrative = new_narrative
        session.add(existing)
        session.commit()
        return LinkResultDTO(
            status="updated",
            narrative=new_narrative,
            xp_gained=0,
            total_xp=user.current_xp,
            level=user.level,
        )

    if req.action == "delete":
        if existing:
            session.delete(existing)
            session.commit()
            return LinkResultDTO(
                status="deleted",
                narrative="连接已断开。",
                xp_gained=0,
                total_xp=user.current_xp,
                level=user.level,
            )
        return LinkResultDTO(
            status="deleted",
            narrative="无连接。",
            xp_gained=0,
            total_xp=user.current_xp,
            level=user.level,
        )

    if existing and not existing.narrative:
        rag_context = BrainService.retrieve_rag_context(f"{req.source_id} {req.target_id}", session)
        existing.narrative = BrainService.generate_narrative(req.source_id, req.target_id, req.type, rag_context)
        session.add(existing)
        session.commit()
        return LinkResultDTO(
            status="updated",
            narrative=existing.narrative,
            xp_gained=0,
            total_xp=user.current_xp,
            level=user.level,
        )

    search_query = f"{req.source_id} {req.target_id}"
    rag_context = BrainService.retrieve_rag_context(search_query, session)
    narrative = BrainService.generate_narrative(req.source_id, req.target_id, req.type, rag_context)

    link = NeuralLink(source_id=req.source_id, target_id=req.target_id, link_type=req.type, narrative=narrative)
    session.add(link)

    user.current_xp += 50
    if user.current_xp >= user.next_level_xp:
        user.level += 1
        user.next_level_xp = int(user.next_level_xp * 1.5)
        narrative += " [UPGRADE]"

    session.add(user)
    session.commit()
    return LinkResultDTO(
        status="created",
        narrative=narrative,
        xp_gained=50,
        total_xp=user.current_xp,
        level=user.level,
    )


@router.post("/link/stream")
def handle_link_action_stream(req: LinkRequest, session: Session = Depends(get_session)):
    existing = session.exec(
        select(NeuralLink).where(
            ((NeuralLink.source_id == req.source_id) & (NeuralLink.target_id == req.target_id))
            | ((NeuralLink.source_id == req.target_id) & (NeuralLink.target_id == req.source_id))
        )
    ).first()

    user = session.get(UserProfile, 1)
    if not user:
        user = UserProfile(id=1, username="Sam", level=1, current_xp=0, next_level_xp=100)
        session.add(user)

    if req.action == "delete":
        if existing:
            session.delete(existing)
            session.commit()
        payload = LinkResultDTO(
            status="deleted",
            narrative="连接已断开。",
            xp_gained=0,
            total_xp=user.current_xp,
            level=user.level,
        )
        narrative = payload.narrative
    elif req.action == "regenerate" and existing:
        search_query = f"{req.source_id} {req.target_id}"
        rag_context = BrainService.retrieve_rag_context(search_query, session)
        new_narrative = BrainService.generate_narrative(req.source_id, req.target_id, req.type, rag_context)
        existing.narrative = new_narrative
        session.add(existing)
        session.commit()
        payload = LinkResultDTO(
            status="updated",
            narrative=new_narrative,
            xp_gained=0,
            total_xp=user.current_xp,
            level=user.level,
        )
        narrative = new_narrative
    else:
        if existing:
            session.commit()
            payload = LinkResultDTO(
                status="exists",
                narrative=existing.narrative or "",
                xp_gained=0,
                total_xp=user.current_xp,
                level=user.level,
            )
            narrative = payload.narrative or ""
        else:
            search_query = f"{req.source_id} {req.target_id}"
            rag_context = BrainService.retrieve_rag_context(search_query, session)
            narrative = BrainService.generate_narrative(req.source_id, req.target_id, req.type, rag_context)

            link = NeuralLink(source_id=req.source_id, target_id=req.target_id, link_type=req.type, narrative=narrative)
            session.add(link)

            user.current_xp += 50
            if user.current_xp >= user.next_level_xp:
                user.level += 1
                user.next_level_xp = int(user.next_level_xp * 1.5)
                narrative = narrative + " [UPGRADE]"

            session.add(user)
            session.commit()
            payload = LinkResultDTO(
                status="created",
                narrative=narrative,
                xp_gained=50,
                total_xp=user.current_xp,
                level=user.level,
            )

    def _sse(obj: dict) -> bytes:
        return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n".encode("utf-8")

    def event_gen():
        yield _sse(
            {
                "type": "meta",
                "status": payload.status,
                "xp_gained": payload.xp_gained,
                "total_xp": payload.total_xp,
                "level": payload.level,
            }
        )

        chunk_size = 24
        for i in range(0, len(narrative), chunk_size):
            yield _sse({"type": "delta", "delta": narrative[i : i + chunk_size]})

        yield _sse({"type": "result", **payload.model_dump()})

    return StreamingResponse(event_gen(), media_type="text/event-stream")

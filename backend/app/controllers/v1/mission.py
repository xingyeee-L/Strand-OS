import json
import random
import uuid
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from langchain_core.documents import Document
from pydantic import BaseModel
from sqlmodel import Session, select

from app.config.database import get_session, get_vector_store
from app.models.schemas import KnowledgeFragment, MissionLog, UserProfile, WordNode
from app.services.book_service import BookService
from app.services.brain import BrainService


class SyncRequest(BaseModel):
    word_id: str
    analysis: Optional[str] = None


router = APIRouter()


@router.post("/missions/generate")
def generate_daily_missions(session: Session = Depends(get_session)):
    today_str = str(date.today())

    existing = session.exec(select(MissionLog).where((MissionLog.date == today_str))).first()
    if existing:
        return {"status": "exists", "message": "Missions already generated for today."}

    DAILY_QUOTA = 10

    user = session.get(UserProfile, 1)
    if not user:
        user = UserProfile(id=1, username="Sam")
        session.add(user)
        session.commit()
        session.refresh(user)

    now = datetime.utcnow()
    review_statement = (
        select(WordNode)
        .where((WordNode.next_review <= now) | (WordNode.next_review == None))
        .limit(DAILY_QUOTA)
    )

    review_candidates = session.exec(review_statement).all()
    review_ids = [n.id for n in review_candidates]

    slots_left = DAILY_QUOTA - len(review_ids)
    explore_ids = []

    if slots_left > 0 and user.current_book:
        new_words = BookService.fetch_new_words(user.current_book, user.book_progress_index, slots_left)
        explore_ids = new_words
        user.book_progress_index += len(new_words)
        session.add(user)

    if review_ids:
        session.add(
            MissionLog(
                date=today_str,
                type="review",
                target_words=json.dumps(review_ids),
                status="active",
                xp_reward=len(review_ids) * 10,
            )
        )

    if explore_ids:
        session.add(
            MissionLog(
                date=today_str,
                type="explore",
                target_words=json.dumps(explore_ids),
                status="active",
                xp_reward=len(explore_ids) * 20,
            )
        )

    session.commit()

    return {"status": "created", "review_count": len(review_ids), "explore_count": len(explore_ids)}


@router.get("/missions/daily")
def get_daily_missions(session: Session = Depends(get_session)):
    today = str(date.today())
    missions = session.exec(select(MissionLog).where(MissionLog.date == today)).all()
    result = []

    for m in missions:
        try:
            target_list = json.loads(m.target_words)
        except Exception:
            target_list = []

        rich_targets = []
        for word in target_list:
            node = session.get(WordNode, word)
            is_reviewed = False
            if node and node.last_review and node.last_review.date() == date.today():
                is_reviewed = True

            rich_targets.append({"word": word, "reviewed": is_reviewed})

        result.append(
            {
                "id": m.id,
                "type": m.type,
                "status": m.status,
                "xp_reward": m.xp_reward,
                "targets": rich_targets,
            }
        )

    return result


@router.post("/mission/complete_word")
def complete_review_word(req: SyncRequest, session: Session = Depends(get_session)):
    target = req.word_id.lower().strip()
    node = session.get(WordNode, target)
    if not node:
        raise HTTPException(404, "Node not found")

    ai_analysis = BrainService.generate_tactical_analysis(target, node.content)

    note_source = f"NOTE:{target}"
    fragment = session.exec(select(KnowledgeFragment).where(KnowledgeFragment.source_file == note_source)).first()
    target_id = fragment.embedding_id if (fragment and fragment.embedding_id) else str(uuid.uuid4())

    try:
        vector_store = get_vector_store()
        doc = Document(page_content=ai_analysis, metadata={"source": note_source, "word_id": target})
        vector_store.add_documents(documents=[doc], ids=[target_id])
    except Exception:
        pass

    if fragment:
        fragment.content = ai_analysis
        fragment.embedding_id = target_id
    else:
        fragment = KnowledgeFragment(content=ai_analysis, source_file=note_source, embedding_id=target_id)
    session.add(fragment)

    next_date, next_stage = BrainService.calculate_next_review(node.review_stage)
    node.last_review = datetime.now()
    node.next_review = next_date
    node.review_stage = next_stage
    node.mastery_level = min(5, next_stage)
    session.add(node)

    user = session.get(UserProfile, 1)
    user.current_xp += 20

    session.add(user)
    session.commit()

    return {"status": "reviewed", "word": target, "analysis": ai_analysis, "xp_gained": 20}


@router.post("/missions/add_extra")
def add_extra_mission(session: Session = Depends(get_session)):
    candidates = session.exec(select(WordNode)).all()

    today = str(date.today())
    today_missions = session.exec(select(MissionLog).where(MissionLog.date == today)).all()
    today_words = set()
    for m in today_missions:
        try:
            today_words.update(json.loads(m.target_words))
        except Exception:
            pass

    valid_candidates = [n.id for n in candidates if n.id not in today_words]

    if not valid_candidates:
        return {"status": "empty", "message": "No words available for review."}

    count = min(3, len(valid_candidates))
    target_ids = random.sample(valid_candidates, count)

    mission = MissionLog(date=today, type="extra_review", target_words=json.dumps(target_ids), status="active", xp_reward=50)
    session.add(mission)
    session.commit()

    return {"status": "created", "targets": target_ids}


@router.delete("/missions/{mission_id}")
def cancel_mission(mission_id: int, session: Session = Depends(get_session)):
    mission = session.get(MissionLog, mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission log not found.")

    session.delete(mission)
    session.commit()

    return {"status": "cancelled", "id": mission_id}


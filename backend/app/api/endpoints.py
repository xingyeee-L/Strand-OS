import json
import os
import shutil
from datetime import date
from datetime import datetime, timedelta
from typing import List, Dict, Any,Optional
from rapidfuzz import fuzz 
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlmodel import Session, select
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from metaphone import doublemetaphone
from app.core.database import get_session, get_vector_store
from app.models.schemas import (
    WordNode, UserProfile, MissionLog, NeuralLink, KnowledgeFragment,
    ScanRequest, LinkRequest, LinkResultDTO, NodeDTO,NoteRequest
)
from app.services.brain import BrainService
from langchain_core.documents import Document
import uuid # 🔥 导入 UUID 库用于生成唯一标识
import random # 🔥 记得导入
from app.services.book_service import BookService


# 临时定义 DTO
from pydantic import BaseModel
class GraphContextDTO(BaseModel):
    center: NodeDTO
    neighbors: List[Dict[str, Any]]

class SyncRequest(BaseModel):
    word_id: str
    analysis: Optional[str] = None # 用户对单词的分析笔记

router = APIRouter()
UPLOAD_DIR = "../data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# -------------------------------------------------------
# 1. 核心交互接口 (星系跳跃 / 扫描 / 虚拟预览)
# -------------------------------------------------------
@router.post("/graph/context", response_model=GraphContextDTO)
def get_graph_context(request: ScanRequest, session: Session = Depends(get_session)):
    target = request.word.lower().strip()
    center_node = session.get(WordNode, target)
    
    # 🔥 [核心逻辑]：发现即收录，空壳必覆盖
    # 判断标准：节点不存在 OR 现有内容是占位符/为空
    is_hollow = not center_node or not center_node.content or "SIGNAL LOST" in center_node.content
    
    if is_hollow:
        # 1. 确定释义
        definition = request.definition or BrainService.fetch_smart_definition(target)
        
        if not center_node:
            # 创建新节点
            center_node = WordNode(
                id=target, content=definition, 
                phonetic_code=doublemetaphone(target)[0],
                mastery_level=0 # 初始等级为 0
            )
        else:
            # 覆盖空壳
            center_node.content = definition
            
        session.add(center_node)
        session.commit()
        session.refresh(center_node)

    # ... (后续捞取笔记、扫描邻居、向日葵坐标逻辑保持不变)
    # 这样跳转后 center_node 必定是已存入数据库的实体

    # C. 捞取笔记 (RAG)
    note_source = f"NOTE:{target}"
    note_frag = session.exec(select(KnowledgeFragment).where(KnowledgeFragment.source_file == note_source)).first()
    current_note = note_frag.content if note_frag else None

    # D. 扫描邻居 (极速版)
    scan_data = BrainService.scan_network_logic(target, session)
    
    # E. 获取物理连接
    existing_links = session.exec(select(NeuralLink).where(
        (NeuralLink.source_id == target) | (NeuralLink.target_id == target)
    )).all()
    
    # F. 组装数据
    neighbors_map = {}
    
    # 1. 物理连接
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
                "mastery_level": node.mastery_level
            }
            
    # 2. 潜在扫描 (排除 NOTE)
    for type_name, ids in scan_data.items():
        for nid in ids:
            if nid.startswith("NOTE:"): continue 
            if nid not in neighbors_map:
                node = session.get(WordNode, nid)
                if node: 
                    neighbors_map[nid] = {
                        "id": nid,
                        "content": node.content,
                        "relation": type_name,
                        "is_linked": False,
                        "narrative": None,
                        "mastery_level": node.mastery_level
                    }

    # G. 计算向日葵坐标
    final_neighbors = []
    for idx, (nid, data) in enumerate(neighbors_map.items()):
        coord_json = BrainService.generate_distributed_coordinates(nid, idx)
        n_dict = data.copy()
        n_dict['position'] = json.loads(coord_json)
        final_neighbors.append(n_dict)

    # H. 任务状态
    today_str = str(date.today())
    missions = session.exec(select(MissionLog).where(MissionLog.date == today_str)).all()
    target_ids = set()
    for m in missions:
        try: target_ids.update(json.loads(m.target_words))
        except: pass
     # 🔥 [关键逻辑] 判定今日是否已同步
    is_reviewed_today = False
    if center_node.last_review:
        # 比对最后复习日期与今日日期
        if center_node.last_review.date() == date.today():
            is_reviewed_today = True

    return GraphContextDTO(
        center=NodeDTO(
            id=center_node.id,
            content=center_node.content,
            mastery_level=center_node.mastery_level,
            is_mission_target=(center_node.id in target_ids),
            is_reviewed_today=is_reviewed_today,
            note=current_note,
            position=None
        ),
        neighbors=final_neighbors
    )




# ==========================================
# 2. 深度扫描接口 (异步 Odradek)
# ==========================================
@router.post("/node/deep_scan")
def deep_scan_node(
    request: ScanRequest, 
    background_tasks: BackgroundTasks, 
    session: Session = Depends(get_session)
):
    target = request.word.lower().strip()
    # 启动后台任务，立刻返回
    background_tasks.add_task(BrainService.run_deep_scan_task, target)
    return {"status": "processing", "message": f"Odradek scan initiated for {target}"}

# ==========================================
# 3. 搜索辅助接口
# ==========================================
@router.get("/search/hints")
def search_hints(q: str, session: Session = Depends(get_session)):
    if not q or len(q) < 2: return []
    q_str = q.lower().strip()
    
    # 1. 本地
    local_hits = session.exec(select(WordNode).where(WordNode.id.like(f"{q_str}%")).limit(5)).all()
    results = []
    local_defs_map = {}
    
    for node in local_hits:
        results.append({
            "word": node.id,
            "lang": "LOCAL", 
            "definition": node.content[:30] + "...",
            "source": "MEMORY"
        })
        if node.id.lower() not in local_defs_map: local_defs_map[node.id.lower()] = []
        local_defs_map[node.id.lower()].append(node.content)
        
    # 2. 云端 (去重)
    cloud_hits = BrainService.composite_search(q_str)
    for hit in cloud_hits:
        w_lower = hit['word'].lower()
        should_show = True
        if w_lower in local_defs_map:
            for local_def in local_defs_map[w_lower]:
                if fuzz.partial_ratio(hit['definition'], local_def) > 70:
                    should_show = False
                    break
        if should_show:
            results.append(hit)
            
    return results

# ==========================================
# 4. 其他 CRUD 接口
# ==========================================
@router.post("/node/note")
def update_node_note(req: NoteRequest, session: Session = Depends(get_session)):
    """
    [工业级 RAG 模式] 利用 embedding_id 实现 SQL 与向量库的强一致性
    """
    note_source = f"NOTE:{req.word_id}"
    
    # 1. 查找现有记录
    fragment = session.exec(
        select(KnowledgeFragment).where(KnowledgeFragment.source_file == note_source)
    ).first()
    
    vector_store = get_vector_store()
    
    # 2. 逻辑分支：更新 或 创建
    if fragment:
        # --- 更新逻辑 ---
        fragment.content = req.note_content
        # 如果旧记录没有 embedding_id，补一个
        if not fragment.embedding_id:
            fragment.embedding_id = str(uuid.uuid4())
        
        # 拿着 embedding_id 去向量库做“覆盖写入”
        # 注意：大部分 VectorStore 通过 ids 参数实现覆盖
        doc = Document(
            page_content=req.note_content,
            metadata={"source": note_source, "word_id": req.word_id}
        )
        vector_store.add_documents(documents=[doc], ids=[fragment.embedding_id])
        
    else:
        # --- 创建逻辑 ---
        new_id = str(uuid.uuid4())
        fragment = KnowledgeFragment(
            content=req.note_content,
            source_file=note_source,
            embedding_id=new_id
        )
        doc = Document(
            page_content=req.note_content,
            metadata={"source": note_source, "word_id": req.word_id}
        )
        vector_store.add_documents(documents=[doc], ids=[new_id])
    
    session.add(fragment)
    session.commit()
    
    print(f"[INDUSTRIAL RAG] Note for {req.word_id} synced with ID: {fragment.embedding_id}")
    return {"status": "success", "embedding_id": fragment.embedding_id}
@router.delete("/node/{node_id}")
def delete_node(node_id: str, session: Session = Depends(get_session)):
    node_id = node_id.lower().strip()
    node = session.get(WordNode, node_id)
    if not node: raise HTTPException(status_code=404, detail="Not found")

    links_source = session.exec(select(NeuralLink).where(NeuralLink.source_id == node_id)).all()
    for link in links_source: session.delete(link)
    links_target = session.exec(select(NeuralLink).where(NeuralLink.target_id == node_id)).all()
    for link in links_target: session.delete(link)

    session.delete(node)
    session.commit()
    return {"status": "voidout_complete", "target": node_id}

@router.post("/link", response_model=LinkResultDTO)
def handle_link_action(req: LinkRequest, session: Session = Depends(get_session)):
    existing = session.exec(select(NeuralLink).where(
        ((NeuralLink.source_id == req.source_id) & (NeuralLink.target_id == req.target_id)) |
        ((NeuralLink.source_id == req.target_id) & (NeuralLink.target_id == req.source_id))
    )).first()
    
    user = session.get(UserProfile, 1)
    if not user:
        user = UserProfile(id=1, username="Sam", level=1, current_xp=0, next_level_xp=100)
        session.add(user)

    if req.action == "regenerate" and existing:
        search_query = f"{req.source_id} {req.target_id}"
        rag_context = BrainService.retrieve_rag_context(search_query)
        new_narrative = BrainService.generate_narrative(req.source_id, req.target_id, req.type, rag_context)
        existing.narrative = new_narrative
        session.add(existing)
        session.commit()
        return LinkResultDTO(status="updated", narrative=new_narrative, xp_gained=0, total_xp=user.current_xp, level=user.level)

    if req.action == "delete":
        if existing:
            session.delete(existing)
            session.commit()
            return LinkResultDTO(status="deleted", narrative="连接已断开。", xp_gained=0, total_xp=user.current_xp, level=user.level)
        return LinkResultDTO(status="deleted", narrative="无连接。", xp_gained=0, total_xp=user.current_xp, level=user.level)

    if existing and not existing.narrative:
        print(f"[Fix] Generating missing narrative for {req.source_id} <-> {req.target_id}")
        rag_context = BrainService.retrieve_rag_context(f"{req.source_id} {req.target_id}")
        existing.narrative = BrainService.generate_narrative(req.source_id, req.target_id, req.type, rag_context)
        session.add(existing)
        session.commit()
        return LinkResultDTO(status="updated", narrative=existing.narrative, xp_gained=0, total_xp=user.current_xp, level=user.level, leveled_up=False)
    
    search_query = f"{req.source_id} {req.target_id}"
    rag_context = BrainService.retrieve_rag_context(search_query)
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
    return LinkResultDTO(status="created", narrative=narrative, xp_gained=50, total_xp=user.current_xp, level=user.level)

@router.get("/user/profile")
def get_user_profile(session: Session = Depends(get_session)):
    user = session.get(UserProfile, 1)
    if not user: 
        user = UserProfile(id=1, username="Sam", level=1, current_xp=0, next_level_xp=100)
        session.add(user)
        session.commit()
    return user

@router.post("/knowledge/upload")
async def upload_knowledge(file: UploadFile = File(...), session: Session = Depends(get_session)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    
    docs = []
    try:
        if file.filename.endswith(".pdf"):
            loader = PyPDFLoader(file_path)
            docs = loader.load()
        elif file.filename.endswith(".txt") or file.filename.endswith(".md"):
            loader = TextLoader(file_path, encoding='utf-8')
            docs = loader.load()
    except Exception as e: return {"status": "error", "message": str(e)}

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    splits = splitter.split_documents(docs)
    chroma_docs = []
    for split in splits:
        frag = KnowledgeFragment(content=split.page_content, source_file=file.filename)
        session.add(frag)
        session.flush()
        split.metadata["fragment_id"] = frag.id
        split.metadata["source"] = file.filename
        chroma_docs.append(split)
    if chroma_docs: get_vector_store().add_documents(chroma_docs)
    session.commit()
    return {"status": "success", "chunks": len(splits)}
# ==========================================
# 8. 任务系统接口 (SRS Mission System)
# ==========================================
# ... import ...

@router.post("/missions/generate")
def generate_daily_missions(session: Session = Depends(get_session)):
    """
    [任务生成器 v2.0]
    逻辑：1. 先查复习任务 -> 2. 若配额未满，从词书取拓荒任务
    """
    today_str = str(date.today())
    
    # 1. 查重：防止今日重复生成
    existing = session.exec(select(MissionLog).where(
        (MissionLog.date == today_str)
    )).first()
    if existing:
        return {"status": "exists", "message": "Missions already generated for today."}

    # --- 核心配置：每日配额 ---
    DAILY_QUOTA = 10  # 每天总共背/复习 10 个词
    
    # 2. 获取当前用户
    user = session.get(UserProfile, 1)
    if not user:
        # 兜底：如果没有用户，创建一个
        user = UserProfile(id=1, username="Sam")
        session.add(user)
        session.commit()
        session.refresh(user)

    # --- A. 第一阶段：筛选复习任务 (Review) ---
    now = datetime.utcnow()
    # 查找：过期词 或 从未复习过的本地词
    review_statement = select(WordNode).where(
        (WordNode.next_review <= now) | (WordNode.next_review == None)
    ).limit(DAILY_QUOTA)
    
    review_candidates = session.exec(review_statement).all()
    review_ids = [n.id for n in review_candidates]
    
    # --- B. 第二阶段：补充拓荒任务 (Exploration) ---
    # 🔥 [修复关键]：明确计算剩余配额
    slots_left = DAILY_QUOTA - len(review_ids)
    explore_ids = []

    if slots_left > 0 and user.current_book:
        print(f"[Mission] Quota remaining: {slots_left}. Fetching from {user.current_book}...")
        
        # 从 BookService 取词
        new_words = BookService.fetch_new_words(
            user.current_book, 
            user.book_progress_index, 
            slots_left
        )
        
        # 将新词加入列表（不创建 WordNode，保持数据库洁癖）
        explore_ids = new_words
        
        # 更新用户词书进度
        user.book_progress_index += len(new_words)
        session.add(user)

    # --- C. 第三阶段：保存任务日志 ---
    # 我们将任务拆分为两条记录，方便前端区分展示
    if review_ids:
        session.add(MissionLog(
            date=today_str, 
            type="review", 
            target_words=json.dumps(review_ids),
            status="active", 
            xp_reward=len(review_ids) * 10
        ))
        
    if explore_ids:
        session.add(MissionLog(
            date=today_str, 
            type="explore", 
            target_words=json.dumps(explore_ids),
            status="active", 
            xp_reward=len(explore_ids) * 20 # 拓荒奖励更高
        ))
        
    session.commit()
    
    return {
        "status": "created", 
        "review_count": len(review_ids), 
        "explore_count": len(explore_ids)
    }

@router.get("/missions/daily")
def get_daily_missions(session: Session = Depends(get_session)):
    today = str(date.today())
    missions = session.exec(select(MissionLog).where(MissionLog.date == today)).all()
    result = []
    
    for m in missions:
        try: target_list = json.loads(m.target_words)
        except: target_list = []
        
        # 🔥 [关键]：构建 rich targets
        rich_targets = []
        for word in target_list:
            node = session.get(WordNode, word)
            is_reviewed = False
            # 检查最后复习时间是否是今天
            if node and node.last_review and node.last_review.date() == date.today():
                is_reviewed = True
            
            rich_targets.append({"word": word, "reviewed": is_reviewed})

        result.append({
            "id": m.id, 
            "type": m.type, 
            "status": m.status, 
            "xp_reward": m.xp_reward, 
            "targets": rich_targets # 🔥 必须叫 targets，对应前端接口
        })
        
    return result

# -------------------------------------------------------
# 9. 任务完成接口 (正式收录 / 复习打卡)
# -------------------------------------------------------
@router.post("/mission/complete_word")
def complete_review_word(req: SyncRequest, session: Session = Depends(get_session)):
    target = req.word_id.lower().strip()
    node = session.get(WordNode, target)
    if not node: raise HTTPException(404, "Node not found")
    
    # 🔥 [核心修改]：自动生成 AI 分析笔记
    print(f"[AI] Generating tactical analysis for: {target}")
    ai_analysis = BrainService.generate_tactical_analysis(target, node.content)

    # 1. 存入/更新知识碎片 (RAG)
    note_source = f"NOTE:{target}"
    fragment = session.exec(select(KnowledgeFragment).where(KnowledgeFragment.source_file == note_source)).first()
    target_id = fragment.embedding_id if (fragment and fragment.embedding_id) else str(uuid.uuid4())
    
    try:
        vector_store = get_vector_store()
        doc = Document(page_content=ai_analysis, metadata={"source": note_source, "word_id": target})
        vector_store.add_documents(documents=[doc], ids=[target_id])
    except: pass

    if fragment:
        fragment.content = ai_analysis
        fragment.embedding_id = target_id
    else:
        fragment = KnowledgeFragment(content=ai_analysis, source_file=note_source, embedding_id=target_id)
    session.add(fragment)

    # 2. SRS 算法更新
    next_date, next_stage = BrainService.calculate_next_review(node.review_stage)
    node.last_review = datetime.now()
    node.next_review = next_date
    node.review_stage = next_stage
    node.mastery_level = min(5, next_stage)
    session.add(node)

    # 3. XP 与结算
    user = session.get(UserProfile, 1)
    user.current_xp += 20 # 基础
    # ... (任务奖励逻辑保持不变) ...

    session.add(user)
    session.commit()
    
    return {
        "status": "reviewed", 
        "word": target, 
        "analysis": ai_analysis, # 🔥 返回 AI 生成的笔记
        "xp_gained": 20
    }


@router.post("/missions/add_extra")
def add_extra_mission(session: Session = Depends(get_session)):
    """
    [主动加练] 用户手动请求额外的复习任务
    """
    # 1. 策略：优先找还没复习的，或者 mastery_level 低的
    # 如果都复习完了，就随机抽查
    candidates = session.exec(select(WordNode)).all()
    
    # 过滤：排除今天已经生成的任务词（避免重复）
    today = str(date.today())
    today_missions = session.exec(select(MissionLog).where(MissionLog.date == today)).all()
    today_words = set()
    for m in today_missions:
        try: today_words.update(json.loads(m.target_words))
        except: pass
        
    valid_candidates = [n.id for n in candidates if n.id not in today_words]
    
    if not valid_candidates:
        return {"status": "empty", "message": "No words available for review."}
    
    # 随机选 3 个
    count = min(3, len(valid_candidates))
    target_ids = random.sample(valid_candidates, count)
    
    # 创建新任务
    mission = MissionLog(
        date=today,
        type="extra_review",
        target_words=json.dumps(target_ids),
        status="active",
        xp_reward=50 # 加练奖励少一点
    )
    session.add(mission)
    session.commit()
    
    return {"status": "created", "targets": target_ids}

@router.get("/books/list")
def list_books():
    books = BookService.get_available_books() # ["IELTS.txt", ...]
    # 简单的读一下行数
    rich_books = []
    for b in books:
        path = os.path.join("backend/books", b) # 注意路径
        try:
            with open(path, 'r') as f:
                count = sum(1 for _ in f)
            rich_books.append({"name": b, "total": count})
        except:
            rich_books.append({"name": b, "total": 0})
    return rich_books

@router.post("/user/set_book")
def set_user_book(book_name: str, session: Session = Depends(get_session)):
    user = session.get(UserProfile, 1)
    if book_name not in BookService.get_available_books():
         raise HTTPException(404, detail="Book not found")
         
    user.current_book = book_name
    # 切换书时，通常不需要重置进度，除非你想从头背
    session.add(user)
    session.commit()
    
    # 🔥 [新增]：立即尝试生成/补充今日任务
    # 调用 generate_daily_missions 逻辑
    # 注意：generate_daily_missions 需要 session，我们可以直接在这里复用逻辑，或者调用函数
    # 这里为了简单，直接调用函数（假设都在 endpoints.py 里）
    try:
        generate_daily_missions(session)
    except Exception as e:
        print(f"[WARN] Auto-generate mission failed: {e}")
        
    return {"status": "success", "current_book": book_name}
# ==========================================
# 9. 任务终止接口 (Abort Mission)
# ==========================================
@router.delete("/missions/{mission_id}")
def cancel_mission(mission_id: int, session: Session = Depends(get_session)):
    """
    [任务中止] 彻底删除一条任务记录
    """
    mission = session.get(MissionLog, mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail="Mission log not found.")

    session.delete(mission)
    session.commit()
    
    print(f"[SYSTEM] Mission {mission_id} has been aborted.")
    return {"status": "cancelled", "id": mission_id}
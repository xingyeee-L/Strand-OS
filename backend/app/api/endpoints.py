import json
import os
import shutil
from datetime import date
from typing import List, Dict, Any
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


# 临时定义 DTO
from pydantic import BaseModel
class GraphContextDTO(BaseModel):
    center: NodeDTO
    neighbors: List[Dict[str, Any]]

router = APIRouter()
UPLOAD_DIR = "../data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ==========================================
# 1. 核心交互接口 (星系跳跃 / 扫描)
# ==========================================
@router.post("/graph/context", response_model=GraphContextDTO)
def get_graph_context(request: ScanRequest, session: Session = Depends(get_session)):
    """
    [星系视图] 核心接口：跳转或创建节点。
    """
    # 🔥 修复点 1：必须先定义 target！
    target = request.word.lower().strip()
    
    # A. 获取或创建中心词
    center_node = session.get(WordNode, target)
    
    # [融合逻辑] 处理前端传来的定义
    if request.definition:
        new_def = request.definition.strip()
        if not center_node:
            print(f"[Brain] Constructing new node: {target}")
            ety = '{"lang":"UNKNOWN", "roots":[], "prefixes":[], "suffixes":[]}'
            center_node = WordNode(
                id=target, 
                content=new_def, 
                etymology=ety, 
                phonetic_code=doublemetaphone(target)[0],
                mastery_level=0
            )
            session.add(center_node)
            session.commit()
            session.refresh(center_node)
        else:
            current_content = center_node.content or ""
            if new_def not in current_content:
                center_node.content = f"{current_content} | {new_def}"
                session.add(center_node)
                session.commit()
                session.refresh(center_node)

    # 兜底创建
    if not center_node:
         definition = BrainService.fetch_smart_definition(target)
         center_node = WordNode(
            id=target, content=definition, etymology="", 
            phonetic_code=doublemetaphone(target)[0], mastery_level=0
         )
         session.add(center_node)
         session.commit()
         session.refresh(center_node)

    # 🔥 修复点 2：获取该单词的笔记碎片 (RAG 模式)
    note_source = f"NOTE:{target}"
    note_frag = session.exec(
        select(KnowledgeFragment).where(KnowledgeFragment.source_file == note_source)
    ).first()
    current_note = note_frag.content if note_frag else None

    # B. 扫描周围节点 (极速巡航模式)
    scan_data = BrainService.scan_network_logic(target, session)
    
    # C. 获取物理连接 (已建成的)
    existing_links = session.exec(select(NeuralLink).where(
        (NeuralLink.source_id == target) | (NeuralLink.target_id == target)
    )).all()
    
    # D. 组装邻居列表
    neighbors_map = {}
    
    # 1. 处理已连接的 (NeuralLink)
    for link in existing_links:
        neighbor_id = link.target_id if link.source_id == target else link.source_id
        
        # 🔥 [关键过滤]：只加载 WordNode 表里的东西
        # 即使 NeuralLink 里记录了 NOTE:xxx，因为 WordNode 里查不到这个 ID，所以会被自动过滤
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
            
    # 2. 处理潜在扫描的 (Scan Data)
    for type_name, ids in scan_data.items():
        for nid in ids:
            # 🔥 [关键过滤]：排除以 "NOTE:" 开头的 ID
            if nid.startswith("NOTE:"): continue 
            
            if nid not in neighbors_map:
                node = session.get(WordNode, nid)
                # 只有 WordNode 存在的才显示，防止显示幽灵节点
                if node: 
                    neighbors_map[nid] = {
                        "id": nid,
                        "content": node.content,
                        "relation": type_name,
                        "is_linked": False,
                        "narrative": None,
                        "mastery_level": node.mastery_level
                    }

    # E. 计算向日葵分布坐标
    final_neighbors = []
    for idx, (nid, data) in enumerate(neighbors_map.items()):
        coord_json = BrainService.generate_distributed_coordinates(nid, idx)
        coord = json.loads(coord_json)
        n_dict = data.copy()
        n_dict['position'] = coord
        final_neighbors.append(n_dict)

    # F. 任务检查
    today_str = str(date.today())
    missions = session.exec(select(MissionLog).where(MissionLog.date == today_str)).all()
    target_ids = set()
    for m in missions:
        try: 
            for t in json.loads(m.target_words): target_ids.add(t)
        except: continue

    # 🔥 修复点 3：返回 NodeDTO 时带上从碎片表捞出来的笔记
    return GraphContextDTO(
        center=NodeDTO(
            id=center_node.id,
            content=center_node.content,
            mastery_level=center_node.mastery_level,
            is_mission_target=(center_node.id in target_ids),
            note=current_note, # <--- 关键
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

    if existing:
        return LinkResultDTO(status="exists", narrative=existing.narrative, xp_gained=0, total_xp=user.current_xp, level=user.level)
    
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

@router.get("/missions/daily")
def get_daily_missions(session: Session = Depends(get_session)):
    today = str(date.today())
    missions = session.exec(select(MissionLog).where(MissionLog.date == today)).all()
    result = []
    for m in missions:
        try: target_list = json.loads(m.target_words)
        except: target_list = []
        result.append({"id": m.id, "type": m.type, "status": m.status, "xp_reward": m.xp_reward, "target_words": target_list})
    return result

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
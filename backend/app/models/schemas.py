from typing import Optional, List
from sqlmodel import SQLModel, Field
from pydantic import BaseModel
from datetime import datetime

# --- 数据库表 ---
class WordNode(SQLModel, table=True):
    id: str = Field(primary_key=True)
    content: str
    etymology: Optional[str] = None
    phonetic_code: Optional[str] = None
    mastery_level: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # 🔥 [SRS 核心字段]
    last_review: Optional[datetime] = None  # 上次复习时间
    next_review: Optional[datetime] = None  # 下次复习时间
    review_stage: int = 0                   # 当前阶段 (0=新词, 1=1天, 2=3天...)

class KnowledgeFragment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: str
    source_file: str  # 笔记存为 "NOTE:word"
    embedding_id: Optional[str] = None # 🔥 确保这一行存在

class NeuralLink(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    source_id: str
    target_id: str
    link_type: str 
    strength: float = 1.0
    narrative: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserProfile(SQLModel, table=True):
    id: int = Field(default=1, primary_key=True)
    username: str = "Sam"
    level: int = 1
    current_xp: int = 0
    next_level_xp: int = 100
    current_book: Optional[str] = None       # 例如 "IELTS.txt"
    book_progress_index: int = 0             # 当前读到第几行

class MissionLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: str 
    type: str # 'review' | 'explore'
    target_words: str # JSON 列表: ["apple", "banana"]
    status: str = "active" # 'active' | 'completed'
    xp_reward: int = 100

# --- DTOs ---
class ScanRequest(BaseModel):
    word: str
    definition: str | None = None

class NodeDTO(BaseModel):
    id: str
    content: str
    mastery_level: int
    is_mission_target: bool = False # 🔥 Python 是 bool
    is_reviewed_today: bool = False 
    note: str | None = None 
    position: List[float] | None = None 

class NoteRequest(BaseModel):
    word_id: str
    note_content: str

class LinkRequest(BaseModel):
    source_id: str
    target_id: str
    type: str 
    action: str = "toggle"

class LinkResultDTO(BaseModel):
    status: str
    narrative: str
    xp_gained: int
    total_xp: int
    level: int
import json
import random
import math
import requests
import re
import jieba
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from rapidfuzz import process, fuzz
from metaphone import doublemetaphone
from sqlmodel import select, Session
try:
    from langchain_ollama import OllamaLLM as Ollama
except ImportError:
    from langchain_community.llms import Ollama
from app.models.schemas import WordNode, NeuralLink
from app.core.database import get_vector_store, engine
from langchain_core.documents import Document

# --- 全局配置 ---
LLM_MODEL = "llama3.1"
# 增加超时至 120s 以应对本地 M4 算力波动，确保后台任务能跑完
llm = Ollama(model=LLM_MODEL, base_url="http://localhost:11434", timeout=120)

# ==========================================
# 🛰️ 第一部分：雷达策略模块 (Cloud Autocomplete)
# ==========================================

class BaseRadar(ABC):
    @abstractmethod
    def scan(self, query: str) -> List[Dict]:
        pass

class EnglishRadar(BaseRadar):
    """英语频段雷达：调用云端建议接口"""
    def scan(self, query: str) -> List[Dict]:
        results = []
        try:
            url = f"http://dict.youdao.com/suggest?q={query}&le=en&num=5&doctype=json"
            resp = requests.get(url, timeout=1)
            if resp.status_code == 200:
                data = resp.json()
                if "data" in data and "entries" in data["data"]:
                    for entry in data["data"]["entries"]:
                        word = entry["entry"]
                        if query.lower() in word.lower():
                            results.append({
                                "word": word, "lang": "EN",
                                "definition": entry.get("explain", "暂无释义")
                            })
        except: pass
        return results

class GermanRadar(BaseRadar):
    """德语频段雷达：专门探测德语联想"""
    def scan(self, query: str) -> List[Dict]:
        results = []
        try:
            url = f"http://dict.youdao.com/suggest?q={query}&le=de&num=5&doctype=json"
            resp = requests.get(url, timeout=1)
            if resp.status_code == 200:
                data = resp.json()
                if "data" in data and "entries" in data["data"]:
                    for entry in data["data"]["entries"]:
                        word = entry["entry"]
                        results.append({
                            "word": word, "lang": "DE",
                            "definition": entry.get("explain", "Unbekannt")
                        })
        except: pass
        return results

# ==========================================
# 🧠 第二部分：大脑核心服务 (Brain Service)
# ==========================================

class BrainService:
    radars = [EnglishRadar(), GermanRadar()]

    # -------------------------------------------------------
    # 🔧 辅助工具：中文语义清洗 (Jieba 驱动)
    # -------------------------------------------------------
    @staticmethod
    def _extract_keywords(text: str) -> set:
        """从释义中提取核心中文实词，过滤字典元数据噪音"""
        if not text: return set()
        # 预清洗：保留中文和数字
        clean_text = re.sub(r'[^\u4e00-\u9fa50-9]', ' ', text)
        words = jieba.cut(clean_text)
        
        # 军用级停用词表：过滤掉“非正式”、“令人”、“接受”等会导致误联的弱词
        stopwords = {
            '的', '了', '是', '在', '和', '与', '或', '指', '及', '其', '之', '以', '等',
            '非正式', '正式', '口语', '书面语', '旧', '古', '美', '英', '方言', '贬义',
            '词性', '名词', '动词', '形容词', '副词', '令人', '让人', '使', '被', '受',
            '表示', '形容', '用于', '关于', '具有', '显示', '通常', '一种', '能够', '不能',
            '人', '某人', '人们', '物', '事物', '接受', '受到', '不受', '不好', '状况', '不佳'
        }
        return {w for w in words if w not in stopwords and len(w.strip()) > 1}

    # -------------------------------------------------------
    # ⚡ 核心扫描逻辑：一档“巡航模式” (极速同步)
    # -------------------------------------------------------
    @staticmethod
    def scan_network_logic(target: str, session: Session):
        """常规跳转时调用的极速算法。完全不调 LLM，保证毫秒级响应。"""
        target = target.lower()
        target_node = session.get(WordNode, target)
        target_def = target_node.content if target_node else ""
        target_keywords = BrainService._extract_keywords(target_def)
        
        # 使用 Raw SQL 加速：只取必要列，避免 ORM 对象创建开销
        query = select(WordNode.id, WordNode.content, WordNode.phonetic_code)
        rows = session.exec(query).all()
        
        all_ids = []
        all_data = {}
        for row in rows:
            nid = row[0]
            if nid == target: continue 
            all_ids.append(nid)
            all_data[nid] = {"content": row[1], "phonetic": row[2]}

        conns = {"morphology": [], "phonetic": [], "etymology": [], "semantic": []}

        # 1. Morphology (拼写)：短词严(90%)，长词宽(75%)
        base_threshold = 95 if len(target) <= 4 else 75
        matches = process.extract(target, all_ids, scorer=fuzz.ratio, limit=5, score_cutoff=base_threshold)
        for w, score, _ in matches: conns["morphology"].append(w)

        # 2. Phonetic (发音)：短词必须全等，长词前缀匹配
        t_code = doublemetaphone(target)[0]
        if t_code:
            for nid in all_ids:
                n_code = all_data[nid]["phonetic"]
                if n_code and (n_code == t_code if len(target) <= 4 else n_code.startswith(t_code)):
                     if fuzz.ratio(target, nid) > 50: conns["phonetic"].append(nid)

        # 3. Semantic (语义)：关键词交集 (解决跨语言关联的核心)
        if target_keywords:
            for nid in all_ids:
                content = all_data[nid]["content"]
                if not content: continue
                # 提取对方关键词并计算交集
                node_keywords = BrainService._extract_keywords(content)
                if target_keywords & node_keywords:
                    conns["semantic"].append(nid)

        # 4. 向量检索：仅召回最强的近义词 (1.0以内)
        try:
            vector_store = get_vector_store()
            docs_with_score = vector_store.similarity_search_with_score(target, k=5)
            for doc, score in docs_with_score:
                if doc.page_content.lower() != target and score < 1.0:
                    conns["semantic"].append(doc.page_content)
        except: pass

        for k in conns: conns[k] = list(set(conns[k]))[:5]
        return conns

    # -------------------------------------------------------
    # 🧠 后台任务：二档“超频模式” (异步 Odradek)
    # -------------------------------------------------------
    @staticmethod
    def run_deep_scan_task(target_id: str):
        """后台异步执行的重型任务：LLM 精排 + 记忆持久化"""
        print(f"[Background Worker] Starting Deep Scan: {target_id}")
        with Session(engine) as session:
            target_node = session.get(WordNode, target_id)
            if not target_node: return

            # 1. 词源分析 (如果缺失)
            if not target_node.etymology:
                target_node.etymology = BrainService.analyze_etymology(target_id)
                session.add(target_node)
                session.commit()

            # 2. 基础扫描召回
            base_conns = BrainService.scan_network_logic(target_id, session)
            
            # 3. LLM 语义精排 (Rerank)
            try:
                vector_store = get_vector_store()
                candidates_for_llm = []
                # 放宽召回范围到 1.35 距离
                docs_with_score = vector_store.similarity_search_with_score(target_id, k=15)
                for doc, score in docs_with_score:
                    nid = doc.page_content
                    if nid.lower() != target_id and score < 1.35:
                        node = session.get(WordNode, nid)
                        if node: candidates_for_llm.append({"id": nid, "content": node.content})
                
                if candidates_for_llm:
                    valid_ids = BrainService.llm_judge_connections(target_id, target_node.content, candidates_for_llm)
                    for vid in valid_ids:
                        if vid not in base_conns["semantic"]: base_conns["semantic"].append(vid)
            except Exception as e: print(f"[Worker Error] {e}")

            # 4. 持久化：将计算结果存入 NeuralLink
            BrainService.save_connections_to_db(target_id, base_conns, session)
            
        print(f"[Background Worker] Deep Scan for {target_id} COMPLETED.")

    # -------------------------------------------------------
    # 💾 持久化与辅助方法
    # -------------------------------------------------------
    @staticmethod
    def save_connections_to_db(source_id: str, conns: Dict[str, List[Any]], session: Session):
        """将扫描结果写入数据库，避免重复计算"""
        count = 0
        existing_links = session.exec(select(NeuralLink).where(
            (NeuralLink.source_id == source_id) | (NeuralLink.target_id == source_id)
        )).all()
        existing_neighbors = { (l.target_id if l.source_id == source_id else l.source_id).lower() for l in existing_links }

        for link_type, targets in conns.items():
            for item in targets:
                # 类型强制收敛 (处理 LLM 可能返回的 dict)
                tid = item if isinstance(item, str) else (item.get("id") or item.get("word"))
                if not tid or tid.lower() == source_id or tid.lower() in existing_neighbors: continue
                
                session.add(NeuralLink(source_id=source_id, target_id=tid.lower(), link_type=link_type))
                existing_neighbors.add(tid.lower())
                count += 1
        session.commit()
        print(f"[Brain] Persisted {count} new links.")

    @staticmethod
    def llm_judge_connections(target: str, target_def: str, candidates: List[Dict]) -> List[str]:
        """LLM 裁判：根据逻辑常识判定两个词是否真的相关"""
        candidates_str = "\n".join([f"- {c['id']}: {c['content'][:50]}" for c in candidates])
        prompt = f"""
        [Task] Select word IDs related to "{target}" (Synonym/Antonym/Root).
        [Def] {target_def}
        [Candidates]
        {candidates_str}
        [Rule] Return JSON array of strings only.
        """
        try:
            res = llm.invoke(prompt)
            match = re.search(r'\[.*\]', res, re.DOTALL)
            if match:
                raw = json.loads(match.group(0))
                return [str(x if isinstance(x, str) else x.get("id")) for x in raw if x]
            return []
        except: return []

    @staticmethod
    def generate_distributed_coordinates(word: str, index: int = 0) -> str:
        """费马螺旋向日葵算法：保证节点均匀分布不重叠"""
        c = 12
        golden_angle = 137.508 * (math.pi / 180.0)
        hash_val = sum(ord(char) for char in word)
        random.seed(hash_val)
        angle_offset = random.uniform(0, 6.28)
        n = index + 1
        theta = n * golden_angle + angle_offset
        r = c * math.sqrt(n)
        if r > 90: r = random.uniform(40, 90)
        return json.dumps([round(r * math.cos(theta), 1), 0, round(r * math.sin(theta), 1)])

    @staticmethod
    def fetch_dual_candidates(word: str) -> List[Dict]:
        """双语直射提取：处理同形异义词 (Homographs)"""
        candidates = []
        try:
            url = f"http://dict.youdao.com/jsonapi?q={word}"
            data = requests.get(url, timeout=1.5).json()
            # 德语提取
            if "fc" in data:
                tr = data["fc"]["word"][0]["trs"][0]["tr"][0]["l"]["i"][0]
                candidates.append({"word": word, "lang": "DE", "definition": tr, "source": "CLOUD", "score": 100})
            # 英语提取
            if "ec" in data:
                tr = data["ec"]["word"][0]["trs"][0]["tr"][0]["l"]["i"][0]
                candidates.append({"word": word, "lang": "EN", "definition": tr, "source": "CLOUD", "score": 100})
        except: pass
        return candidates

    @staticmethod
    def composite_search(query: str) -> List[Dict]:
        """全频段搜索：聚合本地记忆与云端雷达"""
        candidates = []
        query_clean = query.replace(" ", "").lower()
        all_hits = BrainService.fetch_dual_candidates(query)
        
        # 云端联想补全
        radar_q = query_clean if len(query_clean) > 1 else query.lower()
        for radar in BrainService.radars: all_hits.extend(radar.scan(radar_q))

        seen = set()
        for h in all_hits:
            fp = f"{h['definition'][:15]}|{h['lang']}" # 释义指纹去重
            if fp not in seen:
                w_lower = h['word'].lower()
                h['score'] = 100 if w_lower == query_clean else (80 if w_lower.startswith(query_clean) else 50)
                candidates.append(h); seen.add(fp)
        
        candidates.sort(key=lambda x: x.get('score', 0), reverse=True)
        return candidates[:10]

    @staticmethod
    def retrieve_rag_context(query: str) -> str:
        """RAG 检索：从向量库提取相关的历史笔记或档案"""
        try:
            vector_store = get_vector_store()
            docs = vector_store.similarity_search(query, k=2)
            res = "\n[关联记忆碎片]:\n"
            found = False
            for d in docs:
                if len(d.page_content) > 30:
                    res += f"- 来自《{d.metadata.get('source','未知')}》: \"{d.page_content[:100]}...\"\n"
                    found = True
            return res if found else ""
        except: return ""

    @staticmethod
    def analyze_etymology(word: str) -> str:
        """极简词源分析：仅返回 JSON"""
        prompt = f"""Analyze "{word}". Return raw JSON only: {{"lang": "EN/DE", "roots": ["root"]}}"""
        try:
            res = llm.invoke(prompt)
            match = re.search(r'\{.*\}', res, re.DOTALL)
            return match.group(0) if match else '{"lang":"EN", "roots":[]}'
        except: return '{"lang":"EN", "roots":[]}'

    @staticmethod
    def fetch_smart_definition(word: str) -> str:
        """(兼容用) 快速获取单一释义"""
        hits = BrainService.fetch_dual_candidates(word)
        if not hits: return "暂无数据"
        return f"[DE] {hits[0]['definition']}" if hits[0]['lang'] == 'DE' else hits[0]['definition']

    @staticmethod
    def generate_narrative(source: str, target: str, link_type: str, context: str = "") -> str:
        """战术剧情生成：科幻、极简、电报体"""
        prompt = f"""
        [Role] 你是STRAND OS TACTICAL AI.同时亦是一个语言学家，精通德语英语
        [Task] 分析这两个词的关联 "{source}" <-> "{target}" ({link_type}).
        [Context] {context}
        [Rule] Sci-fi, 30字以内. Mark (DE) if German.说中文，简短精炼
        [Example] "词根'port'共振。Import是入，Export是出。"
        最后输入的结果不用包含上面的提示词
        """
        try:
            return llm.invoke(prompt).strip().replace('"', '').split("日志")[-1].strip(": ")
        except: return f"Link active: {source} ↔ {target}."
import json
import random
import math
import requests
import re
import jieba
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
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
        target = target.lower()
        target_node = session.get(WordNode, target)
        target_def = target_node.content if target_node else ""
        target_keywords = BrainService._extract_keywords(target_def)
        
        # 🔥 优化点 1：Raw SQL 同时加载词源数据
        query = select(WordNode.id, WordNode.content, WordNode.phonetic_code, WordNode.etymology)
        rows = session.exec(query).all()
        
        all_ids = []
        all_data = {}
        for row in rows:
            nid = row[0]
            if nid == target: continue 
            all_ids.append(nid)
            all_data[nid] = {"content": row[1], "phonetic": row[2], "etymology": row[3]}

        conns = {"morphology": [], "phonetic": [], "etymology": [], "semantic": []}

        # Morphology & Phonetic 保持不变...
        base_threshold = 95 if len(target) <= 4 else 75
        matches = process.extract(target, all_ids, scorer=fuzz.ratio, limit=5, score_cutoff=base_threshold)
        for w, score, _ in matches: conns["morphology"].append(w)

        t_code = doublemetaphone(target)[0]
        if t_code:
            for nid in all_ids:
                n_code = all_data[nid]["phonetic"]
                if n_code and (n_code == t_code if len(target) <= 4 else n_code.startswith(t_code)):
                     if fuzz.ratio(target, nid) > 50: conns["phonetic"].append(nid)

        # 🔥 优化点 2：内存词源快速比对
        if target_node and target_node.etymology:
            try:
                t_ety = json.loads(target_node.etymology)
                t_roots = {r.lower() for r in t_ety.get("roots", []) if len(r) > 2}
                if t_roots:
                    for nid, data in all_data.items():
                        if data["etymology"]:
                            n_roots = {r.lower() for r in json.loads(data["etymology"]).get("roots", [])}
                            if t_roots & n_roots: # 集合交集计算
                                conns["etymology"].append(nid)
            except: pass

        # Semantic (关键词) 保持不变...
        if target_keywords:
            for nid in all_ids:
                if nid in conns["semantic"]: continue
                node_keywords = BrainService._extract_keywords(all_data[nid]["content"])
                if target_keywords & node_keywords: conns["semantic"].append(nid)

        # 向量检索 (严格模式)
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

    # --- 1. 防御性 LLM 裁判 (解决幻觉与解析错误) ---
    @staticmethod
    def llm_judge_connections(target: str, target_def: str, candidates: List[Dict]) -> List[str]:
        if not candidates: return []
        
        # 为每个候选词建立索引，方便白名单校验
        candidate_map = {c['id'].lower(): c['id'] for c in candidates}
        candidates_str = "\n".join([f"- {c['id']}: {c['content'][:40]}" for c in candidates])
        
        prompt = f"""
        [Task] 从列表中筛选出与 "{target}" 具有强逻辑关联（同义/反义/同源）的词。
        [目标定义] {target_def}
        [候选列表]
        {candidates_str}
        [要求] 
        1. 只返回 JSON 字符串数组，例如 ["id1", "id2"]。
        2. 严禁返回列表之外的单词。
        3. 严禁任何解释说明。
        """
        try:
            res = llm.invoke(prompt)
            # 强化解析：提取最后一个 [ ] 块
            matches = re.findall(r'\[\s*".*?"\s*\]|\[\s*\]', res, re.DOTALL)
            if matches:
                raw_list = json.loads(matches[-1])
                # 🔥 白名单硬过滤：剔除所有幻觉词
                return [candidate_map[str(vid).lower()] for vid in raw_list if str(vid).lower() in candidate_map]
            return []
        except Exception as e:
            print(f"⚠️ [LLM Judge Error] 采用向量召回前3名作为兜底: {e}")
            return [c['id'] for c in candidates[:3]] # 熔断兜底
        
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
        """
        [极速补盲版] 查词引擎
        1. 尝试有道全字段 (含 DE)
        2. 若失败，开启 1s LLM 瞬时翻译
        """
        try:
            url = f"http://dict.youdao.com/jsonapi?q={word}"
            resp = requests.get(url, timeout=1.2)
            if resp.status_code == 200:
                data = resp.json()
                # A. 德语优先
                if "fc" in data and "word" in data["fc"]:
                    return f"[DE] {data['fc']['word'][0]['trs'][0]['tr'][0]['l']['i'][0]}"
                # B. 英语
                if "ec" in data and "word" in data["ec"]:
                    return data["ec"]["word"][0]["trs"][0]["tr"][0]["l"]["i"][0]
        except: pass
        
        # 🔥 [新增] 1秒 LLM 补盲逻辑：只要求翻译，绝不废话
        try:
            prompt = f"Translate '{word}' to Chinese. Concise, max 10 chars. Mark [DE] if German."
            # 使用 stop token 强制截断，防止 AI 话多
            res = llm.invoke(prompt, stop=["\n"]).strip()
            return res if res else "UNKNOWN SIGNAL"
        except:
            return "SIGNAL LOST: 暂无数据"
    # -------------------------------------------------------
    # 🧠 [SRS 引擎] 艾宾浩斯间隔算法 (简化版)
    # -------------------------------------------------------
    @staticmethod
    def calculate_next_review(current_stage: int) -> tuple[datetime, int]:
        """
        根据当前阶段计算下次复习时间。
        间隔策略：0 -> 1天 -> 3天 -> 7天 -> 15天 -> 30天 -> 60天
        """
        now = datetime.utcnow()
        intervals = [1, 3, 7, 15, 30, 60] # 天数
        
        if current_stage >= len(intervals):
            days = 90 # 满级后每90天复习一次
            next_stage = current_stage # 封顶
        else:
            days = intervals[current_stage]
            next_stage = current_stage + 1
            
        next_date = now + timedelta(days=days)
        return next_date, next_stage
    # --- 后台任务与剧情生成逻辑 (已优化) ---
    @staticmethod
    def generate_narrative(source: str, target: str, link_type: str, context: str = "") -> str:
        type_hint = {"morphology": "拼写对比", "etymology": "词源追溯", "semantic": "语义逻辑"}.get(link_type, "关联分析")
        prompt = f"""
        [Role] 你是 STRAND OS TACTICAL AI 语言学家。
        [Task] 极其简短地分析 "{source}" 与 "{target}" 的连接 ({link_type})。
        [Context] {context}
        [Rule] 绝不输出“这两个词”等废话。中文，25字内。
        [Output] 直接给出结论。
        """
        try:
            res = llm.invoke(prompt, stop=["\n"]).strip()
            return res.split(":")[-1].strip()
        except: return f"Connection: {source} ↔ {target}."
    @staticmethod
    def generate_tactical_analysis(word: str, definition: str) -> str:
        """
        [高级指令] 为单词生成深度记忆锚点。
        侧重：词根、联想、德英对比。
        """
        prompt = f"""
        [Role] 你是 STRAND OS 首席语言学家 SC-7274。
        [Task] 为单词 "{word}" 刻录战术记忆指纹。
        [基本释义] {definition}
        
        [指令]
        1. 分析该词的“记忆锚点”：如果是德语同源词请指出，如果是复杂词请拆解词根。
        2. 语气：极简、冷峻、硬核。
        3. 长度：严控在 40 字以内。
        4. 格式示例：
           - "来源：源自原始日耳曼语 *watar。与德语 Wasser 语义完全重合。"
           - "构造：Prefix 'sub-' (下) + 'marine' (海)。直击：海面之下。"
        
        [输出] 直接输出结论，不要前缀。
        """
        try:
            res = llm.invoke(prompt, stop=["\n"]).strip()
            return res.replace('"', '')
        except:
            return f"数据刻录完成。目标：{word}。链路状态：稳定。"
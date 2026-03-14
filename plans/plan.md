这是一份基于目前系统架构与代码逻辑生成的完整项目文档。你可以将其保存为 PROJECT_DOCUMENTATION.md。
🌌 Strand OS 项目技术文档
Version: 1.1-Dev
Status: Alpha / Active Development
Date: 2026-01-22  版本：1.1-Dev
状态：Alpha / 活跃开发

1. 项目概述
Strand OS 是一个本地优先 (Local-First) 的沉浸式三维语言学习系统。它摒弃了传统的列表式背单词体验，采用了《死亡搁浅》风格的科幻战术界面，将单词具象化为三维空间中的“节点”。
1.1 核心理念
连接 (Connection)：学习不是孤立的记忆，而是建立知识点之间的神经网络。
拓荒 (Exploration)：学习新词如同在未知的荒原上建立新的中继站。
沉浸 (Immersion)：通过全息 UI、3D 地形和战术音效，提供极致的心流体验。
1.2 主要特性
🌌 星系跳跃系统：在无缝的 3D 地形中飞跃，探索单词构成的知识星系。
🧠 双速大脑引擎：
巡航模式：毫秒级响应的本地算法扫描。
超频模式 (Odradek)：基于 LLM 的异步深度关联挖掘。
♻️ SRS 记忆闭环：内置艾宾浩斯遗忘曲线算法，科学规划复习进度。
📚 词书拓荒：支持导入外部词书（如 IELTS/CET-4），自动规划每日新词学习。
🔗 RAG 战术笔记：用户笔记自动向量化，作为 AI 生成剧情的上下文参考。
🎧 全感官反馈：集成 TTS 语音播报与机械战术音效。
2. 技术架构
2.1 整体架构图
系统采用 Electron + React (Frontend) + Python (Backend) 的单体集成架构。
code
Mermaid
graph TD
    User[用户] --> Electron[Electron 外壳]
    subgraph Frontend [前端 (React + Three.js)]
        UI[2D HUD 界面]
        Canvas[3D 渲染引擎]
        Store[Zustand 状态管理]
    end
    subgraph Backend [后端 (Python FastAPI)]
        API[API 路由层]
        Brain[BrainService 核心算法]
        LLM[Ollama / LangChain]
        DB_SQL[SQLite (关系数据)]
        DB_VEC[ChromaDB (向量数据)]
    end
    Electron --> Frontend
    Frontend -- Axios/HTTP --> API
    API --> Brain
    Brain --> LLM
    Brain --> DB_SQL
    Brain --> DB_VEC
2.2 技术栈详细说明
层级	技术选型	说明
桌面壳	Electron	提供跨平台桌面运行环境，管理生命周期。
前端框架	React 18 + Vite	高性能 UI 构建，支持 HMR 热重载。
3D 引擎	Three.js	@react-three/fiber, @react-three/drei 用于声明式 3D 编程。
样式	Tailwind CSS	快速构建科幻风格 UI。
后端框架	FastAPI	高性能异步 Python Web 框架。
数据库	SQLModel (SQLite)	ORM 层，管理关系型数据。
向量库	ChromaDB	本地向量数据库，用于语义检索和 RAG。
AI 模型	Ollama (Llama 3.1)	本地运行的大语言模型，负责推理与生成。
打包	PyInstaller	将 Python 后端打包为独立二进制文件。
3. 核心功能模块
3.1 星系导航系统
物理吸附：利用 Raycasting (射线检测) 确保节点紧贴地形表面。
水面浮力：当节点位于海平面以下时，自动计算浮力使其漂浮。
智能运镜：摄像机跟随采用非对称阻尼与动态 FOV，制造“飞行感”。
3.2 智能扫描引擎 (The Radar)
采用多维度混合检索策略：
形态学 (Morphology)：基于 RapidFuzz 编辑距离，发现拼写相似词。
语音学 (Phonetic)：基于 Double Metaphone，发现发音相似词。
语义学 (Semantic)：
向量检索：ChromaDB 语义近邻。
关键词交集：Jieba 分词提取中文释义核心词，解决跨语言关联。
3.3 任务管理系统
复习 (Review)：根据 next_review 时间筛选今日需复习词汇。
拓荒 (Exploration)：根据每日配额，自动从当前词书 (current_book) 中提取生词。
持久化：任务状态记录在 MissionLog 表中。
3.4 RAG 知识库
用户在前端输入的笔记会自动存入 KnowledgeFragment 表。
笔记内容会被向量化存入 ChromaDB。
当 AI 生成剧情时，会自动检索相关的历史笔记作为 Context。
4. 数据模型设计
4.1 WordNode (单词节点)
字段	类型	说明
id	String (PK)  字符串（主键）	单词本身 (e.g., "apple")
content  内容	String  字符串	单词释义
etymology  词源	JSON String  JSON 字符串	词源数据 (root, prefix, suffix)
词源数据 (词根, 前缀, 后缀)
phonetic_code  音标代码	String  字符串	双变音发音码
mastery_level  掌握程度	Int  整	掌握等级 (0-5)
last_review  最后审查	DateTime  日期时间	上次复习时间
next_review  下次评审	DateTime  日期时间	下次复习时间 (SRS计算)
review_stage  评审阶段	Int  整型	当前复习阶段
4.2 NeuralLink (神经连接)
字段	类型	说明
source_id	String	起点单词
target_id	String	终点单词
link_type	String	连接类型 (semantic, morphology...)
narrative	String	AI 生成的连接剧情
created_at	DateTime	连接建立时间
4.3 UserProfile (用户档案)
字段	类型	说明
level	Int	用户等级
current_xp	Int	当前经验值
current_book	String	当前正在背诵的词书文件名
book_progress_index	Int	词书阅读进度游标
5. API 接口文档 (精选)
5.1 获取图谱上下文
Endpoint: POST /graph/context
描述: 获取中心词及其邻居节点。如果中心词不存在，会根据拓荒逻辑返回虚拟节点。
Request:
code
JSON
{ "word": "apple", "definition": "n. 苹果" }
Response: 包含 center (NodeDTO) 和 neighbors (List) 的完整图谱数据。
5.2 深度扫描 (Odradek)
Endpoint: POST /node/deep_scan
接口：POST /node/deep_scan

描述: 触发后台异步任务，调用 LLM 进行深度关联挖掘。
Response: 200 OK (立即返回，前端轮询结果)。
5.3 单词复习/同步
Endpoint: POST /mission/complete_word
接口：POST /mission/complete_word

描述: 用户确认掌握单词。触发 SRS 算法更新、笔记保存、向量化及 XP 结算。
Request:  请求：

code
JSON
{ "word_id": "apple", "analysis": "我的个人笔记..." }
5.4 任务生成
Endpoint: POST /missions/generate
端点：POST /missions/generate

描述: 每日首次登录触发。混合生成复习任务与新词拓荒任务。
6. 算法实现细节
6.1 向日葵坐标分布算法
为了防止 3D 空间中节点重叠，采用 费马螺旋 (Fermat's Spiral) 算法计算邻居坐标：
code
Python
theta = index * 137.508° (黄金角)
r = c * sqrt(index)
x = r * cos(theta)
z = r * sin(theta)
6.2 双速扫描架构
一档 (同步)：
Raw SQL 拉取全量 Tuple 数据。
RapidFuzz 计算编辑距离。
Jieba 计算中文关键词交集。
二档 (异步)：
向量库宽泛召回 (Top 20)。
LLM 作为判官 (Rerank)，剔除逻辑不通的弱关联。
7. 开发环境搭建
7.1 系统要求
OS: macOS (推荐 M系列芯片), Windows, Linux
Runtime: Node.js v18+, Python 3.11+
运行时：Node.js v18+，Python 3.11+

AI: Ollama (需预先安装并拉取 llama3.1 模型)
7.2 启动流程
启动 Ollama: ollama serve
启动后端:
code
Bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
启动前端:
code
Bash
cd frontend
npm run dev
启动桌面端 (Electron):
code
Bash
npm start
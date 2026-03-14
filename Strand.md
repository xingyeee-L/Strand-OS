# Strand OS 技术文档（工程化完整版）

**文档版本**: v1.3.0  
**最后更新时间**: 2026-03-14  
**仓库根目录**: `/Users/lijunyi/Code/Strand`  

> 本文档面向“企业级/工程级”交付标准，覆盖：架构设计、模块划分、RAG/蒸馏链路、数据库结构、API 规格、配置与环境变量、错误处理与安全策略、性能优化、测试与部署，并整理关键代码片段（含路径、行号、实现注释）。

## 0. 比赛合规（Gemini + GenAI SDK + Google Cloud）

本项目已对齐挑战赛最低要求：

- **Gemini 模型**：后端通过 `LLM_TYPE=gemini` + `GOOGLE_API_KEY` 使用 Gemini（文本 + 视觉）。
- **Google GenAI SDK / ADK**：Gemini 调用使用 **Google GenAI SDK（`google-genai`）**，实现位于：  
  - [llm_factory.py](file:///Users/lijunyi/Code/Strand/backend/app/config/llm_factory.py)
- **Google Cloud 服务**：知识上传支持写入 **Google Cloud Storage (GCS)**（配置 `GCS_BUCKET` 即启用），实现位于：  
  - [knowledge.py](file:///Users/lijunyi/Code/Strand/backend/app/controllers/v1/knowledge.py)

部署建议与“证明材料”做法见：根目录 [README.md](file:///Users/lijunyi/Code/Strand/README.md) 的“比赛合规”章节。

## 16. Strand 路线图 (Roadmap Status)

> 更新对应任务条目的完成度百分比、验收标准达成情况、下一步计划。

| 任务 ID | 功能描述 | 完成度 | 验收标准 | 下一步计划 |
|---|---|---|---|---|
| E4.2 | 环境配置与安全增强 | 100% | 配置中心化，日志脱敏成功 | (已完成) |
| G5.1 | 集成 GeminiProvider | 100% | Gemini 文本与视觉可用 | (已完成) |
| G5.1b | Gemini 改用 Google GenAI SDK | 100% | `google-genai` 直接调用成功 | (已完成) |
| G5.2 | 蒸馏链路 Prompt 调优 | 100% | 满足 Markdown 列表格式输出 | (已完成) |
| G5.3 | 知识上传直传 GCS | 100% | RAW 上传至 GCS，写 URL 到 DB | (已完成) |
| G5.4/5.5 | 视觉分析链路 | 100% | 前端截图采集，后端视觉分析接口 | (已完成) |
| G5.0/5.8/5.9 | Agent 命令台与 HUD 状态机 | 100% | 自由对话，五态指示灯，截图动效 | (已完成) |
| G5.6/5.7 | 音频交互 (STT + TTS) | 100% | 语音转文字，分句播报，可打断 | (已完成) |
| UX1 | Chat/Search 分离与防误触 | 100% | Chat 不误跳；Search 候选稳定 | (已完成) |
| UX2 | UI 中英双语与切换 | 100% | 主要按钮/组件文案可切换 | (已完成) |
| DEPLOY1 | Cloud Run 部署材料 | 100% | Dockerfile + README 指引 | (已完成) |

---

## 目录

- [1. 项目总览](#1-项目总览)
- [2. 仓库结构与文件索引](#2-仓库结构与文件索引)
- [3. 系统架构设计](#3-系统架构设计)
- [4. 后端（FastAPI）工程细节](#4-后端fastapi工程细节)
- [5. 前端（React + R3F）工程细节](#5-前端react--r3f工程细节)
- [6. 桌面端（Electron）与打包发布](#6-桌面端electron与打包发布)
- [7. 数据库与数据结构设计](#7-数据库与数据结构设计)
- [8. RAG / 蒸馏链路（工业化输入）](#8-rag--蒸馏链路工业化输入)
- [9. API 接口文档（规格）](#9-api-接口文档规格)
- [10. 配置文件与环境变量](#10-配置文件与环境变量)
- [11. 错误处理、日志与安全策略](#11-错误处理日志与安全策略)
- [12. 性能优化方案与现状指标](#12-性能优化方案与现状指标)
- [13. 测试体系与覆盖情况](#13-测试体系与覆盖情况)
- [14. 部署与运维指南](#14-部署与运维指南)
- [15. 关键代码片段（带注释、路径与行号）](#15-关键代码片段带注释路径与行号)
- [16. 项目总结报告](#16-项目总结报告)

---

## 1. 项目总览

**Strand OS** 是一套把“知识图谱（3D）+ AI（LLM/RAG）+ SRS（间隔复习）+ 游戏化任务系统”融合成统一体验的认知增强系统：

- **3D 知识空间**：以节点（词/概念）+ 连接（morphology/phonetic/etymology/semantic）构建可探索的知识网络。
- **AI 推理与叙事**：通过 LLM 生成释义、词源、连接叙事与记忆锚点。
- **RAG 记忆库**：将笔记与资料碎片写入数据库，同时同步向量索引；新版本进一步引入“蒸馏层”增强检索稳定性。
- **SRS 复习引擎**：通过阶段式间隔策略驱动每日任务、打卡与 XP 成长。

---

## 2. 仓库结构与文件索引

### 2.1 总体目录树（关键路径）

```text
Strand/
├─ backend/                      # FastAPI + SQLModel + ChromaDB + LangChain
│  ├─ main.py                    # 后端入口：lifespan + CORS + router
│  ├─ requirements.txt           # Python 依赖
│  ├─ Dockerfile                 # Cloud Run / 容器化部署
│  ├─ app/
│  │  ├─ config/                 # settings / database / llm / logging
│  │  ├─ routes/                 # 路由聚合（v1）
│  │  ├─ controllers/            # v1 控制器（graph/knowledge/mission/user/agent）
│  │  ├─ models/schemas.py       # SQLModel 表 + DTO
│  │  └─ services/               # Brain / Distiller / Book 等业务逻辑
│  ├─ tests/                     # pytest 用例
│  └─ strand-brain.spec          # PyInstaller spec
├─ frontend/                     # React + Vite + Three.js + Zustand
│  ├─ package.json               # 前端依赖与脚本
│  ├─ vite.config.ts             # base './' 以支持 Electron 打包资源引用
│  └─ src/
│     ├─ services/apiClient.ts   # axios baseURL（支持 env 覆盖）
│     ├─ store/store.ts          # Store 切片（UI/Mission/User/Graph/Knowledge）
│     ├─ i18n/index.ts           # 中英双语与持久化
│     ├─ components/
│     │  ├─ canvas/*             # 3D 渲染与交互
│     │  └─ ui/*                 # HUD/任务板/对话栏/词书管理等
│     └─ pages/Start.tsx         # 启动页（统一风格）
├─ electron-main.js              # Electron 主进程：窗口 + 启动后端
├─ electron-builder.json         # electron-builder 打包配置
└─ start.sh                      # 一键启动：后端 + 前端（dev）
```

### 2.2 依赖库与版本信息（精确来源）

#### 前端依赖（来源：frontend/package.json）

| 类别 | 依赖 | 版本 |
|---|---|---|
| runtime | react / react-dom | ^18.3.1 / ^18.3.1 |
| runtime | three | ^0.165.0 |
| runtime | @react-three/fiber | ^8.16.8 |
| runtime | @react-three/drei | ^9.108.0 |
| runtime | zustand | ^5.0.9 |
| runtime | axios | ^1.13.2 |
| dev | typescript | ~5.9.3 |
| dev | vite | npm:rolldown-vite@7.2.5 |
| dev | eslint | ^9.39.1 |
| dev | vitest | ^4.1.0 |
| dev | tailwindcss | ^3.4.17 |

#### 后端依赖（来源：backend/requirements.txt）

> 当前 requirements 未锁版本（企业级建议引入 lockfile / hash pin）。

| 分类 | 依赖 |
|---|---|
| Web | fastapi, uvicorn[standard], python-multipart |
| ORM/DB | sqlmodel, chromadb |
| AI/RAG | langchain, langchain-community, langchain-huggingface, langchain-chroma, ollama |
| Gemini | google-genai（Google GenAI SDK）, langchain-google-genai（保留兼容） |
| 算法 | rapidfuzz, metaphone, sentence-transformers |
| 文档解析 | pypdf, unstructured |

#### 桌面端依赖（来源：根目录 package.json）

> 根目录 [package.json](file:///Users/lijunyi/Code/Strand/package.json) 当前 JSON 结构存在明显的括号不匹配，可能影响 npm 工具链解析；Electron 打包依赖以该文件为入口时需先修复。

### 2.2 文档与计划

- 企业级进化路线图（打勾追踪）：[evolution.md](file:///Users/lijunyi/Code/Strand/plans/evolution.md)
- 本文档（工程化完整版）：[Strand.md](file:///Users/lijunyi/Code/Strand/Strand.md)

---

## 3. 系统架构设计

### 3.1 逻辑架构图（组件视图）

```text
┌──────────────────────────┐
│  Desktop Shell (Electron) │
│  - window lifecycle       │
│  - start backend process  │
└──────────────┬───────────┘
               │ load dist/index.html
┌──────────────▼───────────┐        HTTP (localhost)
│ Frontend (React + R3F)    │ <------------------------------┐
│ - 3D scene (Three.js)     │                                │
│ - UI / HUD / Missions     │                                │
│ - Zustand store           │                                │
└──────────────┬───────────┘                                │
               │                                            │
┌──────────────▼───────────┐                                │
│ Backend (FastAPI)         │                                │
│ - API routers (v1)        │                                │
│ - BrainService (AI/RAG)   │                                │
│ - Distiller (RAW→精炼)     │                                │
└──────────────┬───────────┘                                │
               │                                            │
      ┌────────▼─────────┐      ┌───────────────────────────▼─────┐
      │ SQLite (SQLModel)│      │ ChromaDB (Vector Store)          │
      │ - WordNode       │      │ - embeddings(all-MiniLM-L6-v2)   │
      │ - NeuralLink     │      │ - similarity_search(*)           │
      │ - KnowledgeFrag  │      └───────────────────────────────────┘
      │ - MissionLog     │
      │ - UserProfile    │
      └──────────────────┘
```

### 3.2 关键数据对象

- **WordNode**：中心知识节点（词/概念），含 SRS 字段（last_review、next_review、review_stage）。
- **NeuralLink**：节点连接（类型/强度/叙事）。
- **KnowledgeFragment**：知识碎片（笔记/资料 chunk），新增实践：RAW 与 DISTILLED 并存（通过 `source_file` 前缀区分）。
- **MissionLog / UserProfile**：任务与成长体系。

---

## 4. 后端（FastAPI）工程细节

### 4.1 启动入口与生命周期

- 入口： [main.py](file:///Users/lijunyi/Code/Strand/backend/main.py)
- 特性：
  - lifespan 启动时创建表结构（`create_db_and_tables()`）
  - CORS 允许所有来源（开发阶段便捷，生产需收敛）
  - 挂载路由（v1 聚合后由兼容层导出）

### 4.2 API 路由分域（已拆分）

- v1 聚合： [routes/v1/api.py](file:///Users/lijunyi/Code/Strand/backend/app/routes/v1/api.py)
- 分域控制器（handler）：
  - 图谱交互： [graph.py](file:///Users/lijunyi/Code/Strand/backend/app/controllers/v1/graph.py)
  - 知识与笔记： [knowledge.py](file:///Users/lijunyi/Code/Strand/backend/app/controllers/v1/knowledge.py)
  - 任务系统： [mission.py](file:///Users/lijunyi/Code/Strand/backend/app/controllers/v1/mission.py)
  - 用户/词书： [user.py](file:///Users/lijunyi/Code/Strand/backend/app/controllers/v1/user.py)
  - Agent（对话/视觉）： [agent.py](file:///Users/lijunyi/Code/Strand/backend/app/controllers/v1/agent.py)

### 4.3 服务层（BrainService）

- 文件： [brain.py](file:///Users/lijunyi/Code/Strand/backend/app/services/brain.py)
- 主要能力：
  - 形态/发音/词源/关键词扫描（召回候选邻居）
  - 向量检索（RAG 上下文 + 深扫 rerank）
  - 叙事生成（link narrative）
  - SRS 算法（间隔复习）

---

## 5. 前端（React + R3F）工程细节

### 5.1 技术栈与状态管理边界

- React 18 + TypeScript + Vite（rolldown-vite）
- Three.js 渲染通过 `@react-three/fiber` 与 `@react-three/drei`
- 全局状态：Zustand store，已按 slice 分域组合（UI/Mission/User/Graph/Knowledge）
- API 调用：统一 axios instance（支持 `VITE_BACKEND_URL` 覆盖）

### 5.2 关键 UI 组成

- 3D 画布组件：`frontend/src/components/canvas/*`（地形、节点标记、连线、镜头控制等）
- UI 组件：`frontend/src/components/ui/*`（对话栏、任务板、词书管理、HUD 等）
- 页面入口：`frontend/src/pages/Dashboard.tsx`

---

## 6. 桌面端（Electron）与打包发布

### 6.1 Electron 主进程行为

- 文件： [electron-main.js](file:///Users/lijunyi/Code/Strand/electron-main.js)
- 行为：
  - 加载 `frontend/dist/index.html`
  - 启动后端可执行文件（PyInstaller 产物），并在 app 退出时终止子进程

### 6.2 打包配置

- electron-builder 配置： [electron-builder.json](file:///Users/lijunyi/Code/Strand/electron-builder.json)
- PyInstaller spec： [strand-brain.spec](file:///Users/lijunyi/Code/Strand/backend/strand-brain.spec)

> 安全提示：Electron 当前使用 `nodeIntegration: true` 与 `contextIsolation: false`（原型开发便捷，但生产环境强烈建议改为隔离模式并通过 preload 暴露最小能力）。

---

## 7. 数据库与数据结构设计

### 7.1 SQLite（SQLModel）表结构

来源： [schemas.py](file:///Users/lijunyi/Code/Strand/backend/app/models/schemas.py)

| 表 | 作用 | 关键字段 |
|---|---|---|
| `wordnode` | 词/概念节点 | `id(PK)`, `content`, `etymology`, `phonetic_code`, `mastery_level`, `last_review`, `next_review`, `review_stage` |
| `neurallink` | 节点连接 | `id(PK)`, `source_id`, `target_id`, `link_type`, `strength`, `narrative`, `created_at` |
| `knowledgefragment` | 知识碎片 | `id(PK)`, `content`, `source_file`, `embedding_id` |
| `userprofile` | 用户档案 | `id(PK)`, `username`, `level`, `current_xp`, `next_level_xp`, `current_book`, `book_progress_index` |
| `missionlog` | 任务日志 | `id(PK)`, `date`, `type`, `target_words(JSON str)`, `status`, `xp_reward` |

### 7.2 向量库（ChromaDB）结构

来源： [database.py](file:///Users/lijunyi/Code/Strand/backend/app/core/database.py)

- collection：`strand_knowledge`
- embedding model：`sentence-transformers/all-MiniLM-L6-v2`
- persist directory：`data/chroma_db`
- 文档元数据：上传蒸馏链路会写入 `source/raw_path/fragment_type/chunk_index/original_filename`

---

## 8. RAG / 蒸馏链路（工业化输入）

### 8.1 当前 RAG 数据分层（RAW + DISTILLED）

- 原始层（RAW）：用户上传的原文件以及每个 chunk 的原始内容（入库但不索引）
- 精炼层（DISTILLED）：对每个 chunk 进行蒸馏，得到更适合检索的“原子化知识点”，**仅精炼层进入向量索引**

> 约定：通过 `KnowledgeFragment.source_file` 前缀区分  
> - `RAW:{raw_filename}#{index}`  
> - `DISTILLED:{raw_filename}#{index}`  
> - `NOTE:{word_id}`（笔记/AI 分析）

### 8.2 蒸馏策略

来源： [distiller.py](file:///Users/lijunyi/Code/Strand/backend/app/services/distiller.py)

- `DISTILL_MODE=heuristic`（默认）：按句号/问号/感叹号切句，取前 8 句组装为要点
- `DISTILL_MODE=llm`：调用当前 LLM provider 进行知识蒸馏（输出 5-12 条要点）
- `DISTILL_MODE=off`：不蒸馏，直接返回清洗后的原文

### 8.3 RAG 检索上下文注入

来源： [retrieve_rag_context](file:///Users/lijunyi/Code/Strand/backend/app/services/brain.py#L316-L329)

- 从向量库 `similarity_search(query, k=2)` 获取最相关的记忆碎片
- 将其拼接为 `"[关联记忆碎片]"` 注入到生成叙事/分析的 prompt 中

---

## 9. API 接口文档（规格）

> 接口基址：`http://127.0.0.1:8000`  
> OpenAPI 文档：`/docs`

### 9.1 Graph（图谱交互）

| Path | Method | Request | Response | 说明 |
|---|---|---|---|---|
| `/` | GET | - | `{status, system, version}` | 健康检查 |
| `/graph/context` | POST | `{word, definition?}` | `{center, neighbors}` | 跳转/扫描星系上下文 |
| `/node/deep_scan` | POST | `{word, definition?}` | `{status, message}` | 触发后台深扫 |
| `/search/hints` | GET | `?q=...` | `Candidate[]` | 联想搜索（本地+云端） |
| `/node/{node_id}` | DELETE | path param | `{status, target}` | 删除节点及连接 |
| `/link` | POST | `{source_id,target_id,type,action}` | `{status,narrative,xp_gained,total_xp,level}` | 建链/断链/重生成叙事 |

### 9.2 Knowledge（笔记与上传）

| Path | Method | Request | Response | 说明 |
|---|---|---|---|---|
| `/node/note` | POST | `{word_id,note_content}` | `{status, embedding_id}` | NOTE 写入（SQL + 向量强绑定） |
| `/knowledge/upload` | POST | multipart `file` | `{status,raw_id,raw_filename,distilled_path,chunks}` | 上传→RAW归档→蒸馏→向量索引 |

### 9.3 Mission（任务系统）

| Path | Method | Request | Response | 说明 |
|---|---|---|---|---|
| `/missions/generate` | POST | - | `{status,review_count,explore_count}` | 生成当日任务（幂等） |
| `/missions/daily` | GET | - | `Mission[]` | 获取当日任务（含 reviewed 状态） |
| `/mission/complete_word` | POST | `{word_id,analysis?}` | `{status,word,analysis,xp_gained}` | 完成复习（SRS 更新 + AI 笔记写入） |
| `/missions/add_extra` | POST | - | `{status,targets}` | 加练任务 |
| `/missions/{mission_id}` | DELETE | path param | `{status,id}` | 中止任务 |

### 9.4 User（用户与词书）

| Path | Method | Request | Response | 说明 |
|---|---|---|---|---|
| `/user/profile` | GET | - | `UserProfile` | 获取或创建默认用户 |
| `/books/list` | GET | - | `{name,total}[]` | 获取可用词书 |
| `/user/set_book` | POST | `?book_name=...` | `{status,current_book}` | 设置词书并尝试生成任务 |

---

## 10. 配置文件与环境变量

### 10.1 前端配置文件

- Vite： [vite.config.ts](file:///Users/lijunyi/Code/Strand/frontend/vite.config.ts)（`base: './'` 适配 Electron 资源路径）
- ESLint： [eslint.config.js](file:///Users/lijunyi/Code/Strand/frontend/eslint.config.js)
- Tailwind： [tailwind.config.js](file:///Users/lijunyi/Code/Strand/frontend/tailwind.config.js)
- PostCSS： [postcss.config.js](file:///Users/lijunyi/Code/Strand/frontend/postcss.config.js)
- TypeScript： [tsconfig.app.json](file:///Users/lijunyi/Code/Strand/frontend/tsconfig.app.json)、[tsconfig.node.json](file:///Users/lijunyi/Code/Strand/frontend/tsconfig.node.json)

#### 前端环境变量

| 变量 | 默认值 | 作用 |
|---|---|---|
| `VITE_BACKEND_URL` | `http://127.0.0.1:8000` | 覆盖前端 API 基址（见 apiClient.ts） |

### 10.2 后端配置与环境变量（运行期）

| 变量 | 默认值 | 作用 |
|---|---|---|
| `LLM_TYPE` | `ollama` | LLM Provider 选择：`ollama` / `openai` |
| `OLLAMA_MODEL` | `llama3.1` | 本地模型名称 |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama 服务地址 |
| `OLLAMA_TIMEOUT` | `120` | 本地推理超时秒数 |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-Compatible API 基址 |
| `OPENAI_API_KEY` | 空 | 云端 API Key |
| `OPENAI_MODEL` | `gpt-4o-mini` | 云端模型名 |
| `OPENAI_TIMEOUT` | `60` | 云端请求超时秒数 |
| `DISTILL_MODE` | `heuristic` | 蒸馏模式：`heuristic` / `llm` / `off` |
| `VECTOR_STORE_DISABLED` | 空 | 单测/离线：禁用向量库（dummy store） |

---

## 11. 错误处理、日志与安全策略

### 11.1 错误处理机制（现状）

- FastAPI 默认异常处理：参数校验错误、路由未命中等由框架处理。
- 显式业务错误：主要使用 `HTTPException`（如节点未找到、任务未找到）。
- 向量库/外部依赖：多处采用 `try/except` 静默降级（避免阻塞核心链路），但缺少统一错误码与可观测性。

### 11.2 日志记录规范（现状与建议）

现状：
- 后端大量使用 `print()`（例如启动日志、后台任务日志），缺少结构化日志字段（request_id、user_id、latency 等）。

建议（企业级）：
- 统一采用 Python `logging`，输出 JSON 格式日志（按 level + module + trace_id）。
- 前端对关键交互与异常上报（Sentry/自研）并聚合到可视化平台。

### 11.3 安全策略（现状）

- CORS：`allow_origins=["*"]`（开发友好，生产建议限定域名与方法）。
- 鉴权：当前无用户鉴权/授权（企业级需要 token/session 策略）。
- Electron：
  - `nodeIntegration: true` 与 `contextIsolation: false`（存在 XSS→RCE 风险）。
  - 生产建议：启用隔离、禁用 nodeIntegration、引入 preload 并最小化 IPC API。

---

## 12. 性能优化方案与现状指标

### 12.1 后端性能点

- 向量库句柄缓存：`get_vector_store()` 使用单例缓存（减少重复加载 embedding 模型）。
- 深扫异步：`BackgroundTasks` 后台执行，避免阻塞主请求。
- 召回策略：形态/发音/词源/关键词 + 向量召回组合（可进一步引入 Hybrid Search 与 Rerank）。

### 12.2 前端性能点

- 三维场景渲染分离于 UI，状态集中由 store 驱动（仍可进一步降低高频状态的触发范围）。
- Vite 构建：产物 gzip 约 362KB（见第 13 节）。

---

## 13. 测试体系与覆盖情况

### 13.1 后端（pytest）

目录：`backend/tests/*`

- [test_api.py](file:///Users/lijunyi/Code/Strand/backend/tests/test_api.py)：健康检查、search hints、user profile
- [test_knowledge_upload.py](file:///Users/lijunyi/Code/Strand/backend/tests/test_knowledge_upload.py)：上传→蒸馏→落盘验证（启用 `VECTOR_STORE_DISABLED=1`）

### 13.2 前端（vitest + eslint + build）

- 单测：`frontend/src/store/store.test.ts`
- 工程校验：`npm run lint`、`npm run build`

---

## 14. 部署与运维指南

### 14.1 开发态一键启动

脚本： [start.sh](file:///Users/lijunyi/Code/Strand/start.sh)

```bash
./start.sh
```

- 前端：`http://localhost:5173`
- 后端：`http://127.0.0.1:8000`（OpenAPI：`/docs`）
- 日志：`backend.log`、`frontend.log`

### 14.2 Electron 打包流程（概要）

1. 构建前端：`cd frontend && npm run build`
2. 打包后端（PyInstaller）：使用 [strand-brain.spec](file:///Users/lijunyi/Code/Strand/backend/strand-brain.spec)
3. electron-builder：读取 [electron-builder.json](file:///Users/lijunyi/Code/Strand/electron-builder.json) 将 `frontend/dist` 与 `backend/dist/strand-brain` 打包入产物

---

## 15. 关键代码片段（带注释、路径与行号）

> 说明：以下代码块顶部注释包含：功能说明、文件路径、行号范围；并在关键逻辑处加入“文档注释”（不代表源代码原生注释）。

### 15.1 后端入口：lifespan + CORS + router 挂载

```python
# 功能: FastAPI 应用入口，启动时创建表结构，配置 CORS，并挂载路由
# 文件: /Users/lijunyi/Code/Strand/backend/main.py
# 行号: L1-L33
# 关键逻辑:
# - lifespan: 启动时 create_db_and_tables()
# - CORS: allow_origins=["*"]（生产需收敛）
# - include_router: 挂载 v1 路由聚合
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import create_db_and_tables
from app.api.endpoints import router
from app.models import schemas

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[SYSTEM] Initializing Database Schema...")
    create_db_and_tables()
    print("[SYSTEM] Database Ready.")
    yield

app = FastAPI(title="Strand OS Brain", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
```

### 15.2 数据层：路径校准 + data 目录规范 + 向量库单例缓存

```python
# 功能: 统一 data 目录路径（SQLite/Chroma/raw_archive/distilled_brain），并提供 vector store 单例
# 文件: /Users/lijunyi/Code/Strand/backend/app/core/database.py
# 行号: L1-L77
# 关键逻辑:
# - project_root 推导：确保从任何 cwd 启动都指向 Strand/data
# - RAW/DISTILLED 两类资料目录：raw_archive / distilled_brain
# - VECTOR_STORE_DISABLED：单测/离线时返回 dummy store（避免拉取 embedding 模型）
import os
from sqlmodel import SQLModel, create_engine, Session
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'

# 文档注释: 从当前文件路径向上推导到项目根目录（Strand/），再定位到 data/
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
project_root = os.path.dirname(backend_dir)
DATA_DIR = os.path.join(project_root, "data")
if not os.path.exists(DATA_DIR):
    print(f"[WARN] Data dir {DATA_DIR} not found. Creating it.")
    os.makedirs(DATA_DIR, exist_ok=True)

SQLITE_PATH = os.path.join(DATA_DIR, "strand.db")
CHROMA_PATH = os.path.join(DATA_DIR, "chroma_db")
RAW_ARCHIVE_PATH = os.path.join(DATA_DIR, "raw_archive")
DISTILLED_BRAIN_PATH = os.path.join(DATA_DIR, "distilled_brain")

os.makedirs(RAW_ARCHIVE_PATH, exist_ok=True)
os.makedirs(DISTILLED_BRAIN_PATH, exist_ok=True)

sqlite_url = f"sqlite:///{SQLITE_PATH}"
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

_vector_store = None
def get_vector_store():
    global _vector_store
    if _vector_store is None:
        if os.getenv("VECTOR_STORE_DISABLED", "").lower() in {"1", "true", "yes"}:
            class _DummyVectorStore:
                def add_documents(self, documents=None, ids=None, **kwargs): return []
                def similarity_search(self, query, k=4, **kwargs): return []
                def similarity_search_with_score(self, query, k=4, **kwargs): return []
            _vector_store = _DummyVectorStore()
            return _vector_store
        # 文档注释: 首次访问时加载 embedding 模型并创建 Chroma collection
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        _vector_store = Chroma(
            collection_name="strand_knowledge",
            embedding_function=embeddings,
            persist_directory=CHROMA_PATH
        )
    return _vector_store
```

### 15.3 LLM Provider：本地 Ollama / 云端 OpenAI-Compatible 可切换

```python
# 功能: 抽象 LLM 调用接口，并通过环境变量切换 provider
# 文件: /Users/lijunyi/Code/Strand/backend/app/core/llm_factory.py
# 行号: L1-L78
# 关键逻辑:
# - LLM_TYPE=ollama/openai
# - OpenAICompatibleProvider 走 /chat/completions 协议
# - get_llm() 返回单例 provider，避免重复初始化
import os
from abc import ABC, abstractmethod
from typing import Iterable, Optional
import httpx

class BaseLLMProvider(ABC):
    @abstractmethod
    def invoke(self, prompt: str, stop: Optional[Iterable[str]] = None) -> str:
        raise NotImplementedError

class OllamaProvider(BaseLLMProvider):
    def __init__(self):
        model = os.getenv("OLLAMA_MODEL", "llama3.1")
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        timeout = float(os.getenv("OLLAMA_TIMEOUT", "120"))
        try:
            from langchain_ollama import OllamaLLM as Ollama
        except ImportError:
            from langchain_community.llms import Ollama
        self._llm = Ollama(model=model, base_url=base_url, timeout=timeout)

    def invoke(self, prompt: str, stop: Optional[Iterable[str]] = None) -> str:
        if stop is None:
            return self._llm.invoke(prompt)
        return self._llm.invoke(prompt, stop=list(stop))

class OpenAICompatibleProvider(BaseLLMProvider):
    def __init__(self):
        self._base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        self._api_key = os.getenv("OPENAI_API_KEY", "")
        self._model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self._timeout = float(os.getenv("OPENAI_TIMEOUT", "60"))

    def invoke(self, prompt: str, stop: Optional[Iterable[str]] = None) -> str:
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        payload = {
            "model": self._model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
        }
        with httpx.Client(timeout=self._timeout) as client:
            resp = client.post(f"{self._base_url}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            text = data["choices"][0]["message"]["content"]
        if stop:
            for token in stop:
                if not token:
                    continue
                idx = text.find(token)
                if idx != -1:
                    text = text[:idx]
        return text.strip()

_provider: Optional[BaseLLMProvider] = None
def get_llm() -> BaseLLMProvider:
    global _provider
    if _provider is not None:
        return _provider
    llm_type = os.getenv("LLM_TYPE", "ollama").lower().strip()
    if llm_type in {"openai", "cloud", "api"}:
        _provider = OpenAICompatibleProvider()
    else:
        _provider = OllamaProvider()
    return _provider
```

### 15.4 资料蒸馏：heuristic / LLM / off

```python
# 功能: 将原始文本蒸馏为更适合 RAG 的“原子化要点”
# 文件: /Users/lijunyi/Code/Strand/backend/app/services/distiller.py
# 行号: L1-L32
# 关键逻辑:
# - DISTILL_MODE=heuristic: 切句取前 N 句
# - DISTILL_MODE=llm: 调用当前 LLM provider 蒸馏为 5-12 条要点
# - DISTILL_MODE=off: 直接返回清洗文本
import os
import re
from app.core.llm_factory import get_llm

def distill_text(text: str) -> str:
    mode = os.getenv("DISTILL_MODE", "heuristic").lower().strip()
    cleaned = re.sub(r"\s+", " ", (text or "").strip())
    if not cleaned:
        return ""
    if mode in {"off", "raw"}:
        return cleaned
    if mode in {"llm", "model"}:
        llm = get_llm()
        prompt = f"""
        你是企业级知识蒸馏引擎。
        将下方内容蒸馏为适合检索增强生成 (RAG) 的“原子化知识点”，要求：
        1) 输出 5-12 条要点，中文优先；保留专有名词/数字/公式符号
        2) 每条 1-2 句，避免口水话，避免自我引用
        3) 仅输出要点列表，不要标题、不解释
        内容：
        {cleaned}
        """
        return llm.invoke(prompt, stop=["\n\n"]).strip() or cleaned
    sentences = re.split(r"(?<=[。！？.!?])\s+", cleaned)
    kept = [s for s in sentences if s][:8]
    distilled = "\n".join(f"- {s.strip()}" for s in kept)
    return distilled if distilled.strip() else cleaned
```

### 15.5 上传链路：RAW 归档 + DISTILLED 落盘 + 仅精炼层向量索引

```python
# 功能: /knowledge/upload 上传资料，生成 RAW 与 DISTILLED 两层知识碎片，并写入 ChromaDB
# 文件: /Users/lijunyi/Code/Strand/backend/app/api/v1/endpoints/knowledge.py
# 行号: L1-L127
# 关键逻辑:
# - raw_path: 保存原始文件到 data/raw_archive
# - RAW:{filename}#{idx}: 原始碎片入库（不索引）
# - DISTILLED:{filename}#{idx}: 蒸馏碎片入库 + embedding_id 绑定 + 进入向量索引
# - distilled_doc_path: 生成规整 markdown 到 data/distilled_brain
import os
import shutil
import uuid

from fastapi import APIRouter, Depends, File, UploadFile
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlmodel import Session, select

from app.core.database import DISTILLED_BRAIN_PATH, RAW_ARCHIVE_PATH, get_session, get_vector_store
from app.models.schemas import KnowledgeFragment, NoteRequest
from app.services.distiller import distill_text

router = APIRouter()

@router.post("/knowledge/upload")
async def upload_knowledge(file: UploadFile = File(...), session: Session = Depends(get_session)):
    raw_id = uuid.uuid4().hex
    raw_filename = f"{raw_id}_{file.filename}"
    raw_path = os.path.join(RAW_ARCHIVE_PATH, raw_filename)

    # 文档注释: 先落盘原始文件，作为“真理来源”（可溯源/可重蒸馏）
    with open(raw_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    docs = []
    try:
        if file.filename.endswith(".pdf"):
            loader = PyPDFLoader(raw_path)
            docs = loader.load()
        elif file.filename.endswith(".txt") or file.filename.endswith(".md"):
            loader = TextLoader(raw_path, encoding="utf-8")
            docs = loader.load()
    except Exception as e:
        return {"status": "error", "message": str(e)}

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    splits = splitter.split_documents(docs)

    distilled_chunks = []
    chroma_docs = []
    chroma_ids = []

    for index, split in enumerate(splits):
        raw_source = f"RAW:{raw_filename}#{index}"
        distilled_source = f"DISTILLED:{raw_filename}#{index}"

        # 文档注释: RAW 入库（不索引）
        raw_frag = KnowledgeFragment(content=split.page_content, source_file=raw_source)
        session.add(raw_frag)

        # 文档注释: 蒸馏内容作为索引原料（DISTILLED 入库 + embedding_id 强绑定）
        distilled = distill_text(split.page_content)
        distilled_chunks.append(distilled)
        embedding_id = uuid.uuid4().hex
        distilled_frag = KnowledgeFragment(content=distilled, source_file=distilled_source, embedding_id=embedding_id)
        session.add(distilled_frag)

        doc = Document(
            page_content=distilled,
            metadata={
                "source": raw_filename,
                "raw_path": raw_path,
                "fragment_type": "distilled",
                "chunk_index": index,
                "original_filename": file.filename,
            },
        )
        chroma_docs.append(doc)
        chroma_ids.append(embedding_id)

    if chroma_docs:
        get_vector_store().add_documents(documents=chroma_docs, ids=chroma_ids)

    session.commit()

    distilled_doc_path = os.path.join(DISTILLED_BRAIN_PATH, f"{raw_id}_{file.filename}.md")
    with open(distilled_doc_path, "w", encoding="utf-8") as f:
        f.write("\n\n".join(distilled_chunks))

    return {"status": "success", "raw_id": raw_id, "raw_filename": raw_filename, "distilled_path": distilled_doc_path, "chunks": len(splits)}
```

### 15.6 图谱上下文：发现即收录 + 邻居组装 + 向日葵坐标

```python
# 功能: /graph/context 获取中心节点与邻居，支持“空壳覆盖”与邻居坐标生成
# 文件: /Users/lijunyi/Code/Strand/backend/app/api/v1/endpoints/graph.py
# 行号: L39-L137
# 关键逻辑:
# - is_hollow: 节点不存在或占位内容时，自动 fetch_smart_definition 覆盖/创建
# - neighbors_map: 先汇总物理连接，再补充扫描连接，最后生成 position
# - is_reviewed_today: 以 last_review.date() 判定
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
    note_frag = session.exec(
        select(KnowledgeFragment).where(KnowledgeFragment.source_file == note_source)
    ).first()
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
    for idx, (nid, data) in enumerate(neighbors_map.items()):
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
```

### 15.7 RAG 检索：从向量库拼接关联记忆碎片

```python
# 功能: 按 query 从向量库取回相关片段，并组装为 prompt 可直接注入的上下文段
# 文件: /Users/lijunyi/Code/Strand/backend/app/services/brain.py
# 行号: L316-L329
# 关键逻辑:
# - similarity_search(query, k=2) 召回最相关记忆片段
# - 仅保留长度 > 30 的片段，避免无意义噪声
@staticmethod
def retrieve_rag_context(query: str) -> str:
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
    except:
        return ""
```

### 15.8 任务完成：AI 笔记入库 + SRS 更新 + XP 增长

```python
# 功能: /mission/complete_word 完成复习（生成记忆锚点 → 写入 NOTE → 更新 SRS → 增加 XP）
# 文件: /Users/lijunyi/Code/Strand/backend/app/api/v1/endpoints/mission.py
# 行号: L121-L161
# 关键逻辑:
# - ai_analysis: generate_tactical_analysis()
# - NOTE: 写入 KnowledgeFragment + embedding_id 绑定 + add_documents 覆盖写入
# - SRS: calculate_next_review() 更新 next_review/review_stage/mastery_level
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
```

### 15.9 前端 API Client：基址可配置

```ts
// 功能: 统一 axios client，并允许通过 VITE_BACKEND_URL 覆盖 API 基址
// 文件: /Users/lijunyi/Code/Strand/frontend/src/services/apiClient.ts
// 行号: L1-L5
// 关键逻辑:
// - import.meta.env.VITE_BACKEND_URL 存在时优先使用
import axios from 'axios';

const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export const apiClient = axios.create({ baseURL });
```

### 15.10 前端 Store：按领域切片组合（精确摘录）

#### 15.10.1 Mission Slice（任务域）

```ts
// 功能: 任务域动作（中止/加练/完成/拉取），并驱动 UI 动画状态
// 文件: /Users/lijunyi/Code/Strand/frontend/src/store/store.ts
// 行号: L91-L153
// 关键逻辑:
// - cancelMission: 删除 mission 后刷新列表
// - completeMission: 调用 /mission/complete_word，刷新任务与用户信息
const createMissionSlice = (set: any, get: any) => ({
  cancelMission: async (missionId: number) => {
    if (!window.confirm('TERMINATE THIS MISSION? 所有进度将丢失。')) return;

    try {
      await apiClient.delete(`/missions/${missionId}`);
      await get().fetchMissions();
    } catch (e) {
      console.error('Failed to abort mission', e);
    }
  },
  requestExtraMission: async () => {
    try {
      await apiClient.post('/missions/add_extra');
      await get().fetchMissions();
    } catch (e) {
      console.error('Extra mission failed', e);
    }
  },
  completeMission: async (word: string, analysis?: string) => {
    const { centerNode } = get();
    if (!centerNode) return;

    set({ isLinking: true });

    try {
      const res = await apiClient.post('/mission/complete_word', {
        word_id: word,
        analysis: analysis || '',
      });

      if (res.data.status === 'reviewed') {
        const ai_analysis = res.data.analysis;

        await get().fetchMissions();

        set({
          centerNode: {
            ...centerNode,
            is_reviewed_today: true,
            note: ai_analysis,
          },
          lastNarrative: ai_analysis,
        });

        const userRes = await apiClient.get('/user/profile');
        set({ user: userRes.data });
      }
    } catch (e) {
      console.error('Mission completion failed:', e);
    } finally {
      set({ isLinking: false });
    }
  },
  fetchMissions: async () => {
    try {
      const res = await apiClient.get('/missions/daily');
      set({ missions: res.data });
    } catch (e) {
      console.error(e);
    }
  },
});
```

#### 15.10.2 Graph Slice（图谱域）

```ts
// 功能: 图谱域动作（initWorld/jumpTo/建链/深扫/删除），统一调用后端接口并落到 store
// 文件: /Users/lijunyi/Code/Strand/frontend/src/store/store.ts
// 行号: L172-L399
// 关键逻辑:
// - jumpTo: 并行请求 /graph/context 与 /user/profile
// - establishLink: /link 返回 narrative 与 XP 结算后更新 neighbors/user
const createGraphSlice = (set: any, get: any) => ({
  initWorld: async () => {
    await get().jumpTo('Strand', [0, 0, 0]);

    try {
      await apiClient.post('/missions/generate');
    } catch (e) {
      console.warn('[Mission] Failed to generate missions:', e);
    }

    await get().fetchMissions();
  },
  jumpTo: async (word: string, targetPos?: [number, number, number], definition?: string) => {
    if (!word) return;
    set({ isScanning: true });

    let currentPos = targetPos;
    if (!currentPos) {
      const existingNode = get().neighbors.find((n: any) => n.id === word);

      if (existingNode) {
        currentPos = existingNode.position;
      } else {
        const JUMP_RADIUS = 40;
        const MAP_BOUNDARY = 120;

        const prevPos = get().centerNode?.position || [0, 0, 0];
        const angle = Math.random() * Math.PI * 2;

        let nextX = prevPos[0] + JUMP_RADIUS * Math.cos(angle);
        let nextZ = prevPos[2] + JUMP_RADIUS * Math.sin(angle);

        const distFromOrigin = Math.sqrt(nextX ** 2 + nextZ ** 2);
        if (distFromOrigin > MAP_BOUNDARY) {
          const resetRadius = 30 + Math.random() * 20;
          nextX = resetRadius * Math.cos(angle);
          nextZ = resetRadius * Math.sin(angle);
        }

        currentPos = [nextX, 0, nextZ];
      }
    }

    try {
      const [graphRes, userRes] = await Promise.all([
        apiClient.post('/graph/context', { word, definition }),
        apiClient.get('/user/profile'),
      ]);

      const { center, neighbors } = graphRes.data;

      if (!center) {
        set({ isScanning: false });
        return;
      }

      const layoutNeighbors = neighbors.map((n: any, index: number) => {
        const [rx, , rz] = n.position || [
          ORBIT_RADIUS * Math.cos((index / neighbors.length) * Math.PI * 2),
          0,
          ORBIT_RADIUS * Math.sin((index / neighbors.length) * Math.PI * 2),
        ];

        return {
          ...n,
          position: [currentPos![0] + rx, 0, currentPos![2] + rz],
        };
      });

      set({
        centerNode: { ...center, position: currentPos },
        neighbors: layoutNeighbors,
        user: userRes.data,
        isScanning: false,
        lastNarrative: null,
        activeNodeId: word,
      });
    } catch (error) {
      console.error('Jump failed:', error);
      set({ isScanning: false });
    }
  },
  addNode: async (word: string) => {
    await get().jumpTo(word);
  },
  establishLink: async (targetId: string, type: string, action = 'toggle') => {
    const { centerNode, neighbors } = get();
    if (!centerNode) return;

    set({ isLinking: true });

    try {
      const res = await apiClient.post('/link', {
        source_id: centerNode.id,
        target_id: targetId,
        type: type,
        action: action,
      });

      const { status, narrative, total_xp, level } = res.data;

      const newNeighbors = neighbors.map((n: any) => {
        if (n.id === targetId) {
          const isNewlyCreated = status === 'created';
          const isUpdated = status === 'updated';
          const isDeleted = status === 'deleted';

          return {
            ...n,
            is_linked: isNewlyCreated || isUpdated || status === 'exists',
            narrative: isDeleted ? undefined : narrative,
            hasUnseenLog: isDeleted ? false : isNewlyCreated || isUpdated,
          };
        }
        return n;
      });

      set({
        neighbors: newNeighbors,
        lastNarrative: status === 'created' ? narrative : get().lastNarrative,
        user: { ...get().user, current_xp: total_xp, level },
      });
    } catch (e) {
      console.error('[Store] Link protocol failed:', e);
    } finally {
      set({ isLinking: false });
    }
  },
  showNarrative: async (targetId: string) => {
    const { neighbors, establishLink } = get();

    const targetNode = neighbors.find((n: any) => n.id === targetId);

    if (targetNode) {
      if (targetNode.is_linked && !targetNode.narrative) {
        await establishLink(targetId, targetNode.relation || 'auto', 'toggle');
        return;
      }

      if (targetNode.narrative) {
        set({ lastNarrative: null });

        setTimeout(() => {
          set({ lastNarrative: targetNode.narrative });
        }, 10);

        set((state: any) => ({
          neighbors: state.neighbors.map((n: any) =>
            n.id === targetId ? { ...n, hasUnseenLog: false } : n,
          ),
        }));
      }
    }
  },
  performDeepScan: async () => {
    const { centerNode } = get();
    if (!centerNode) return;
    const word = centerNode.id;

    set({ isScanning: true });

    try {
      await apiClient.post('/node/deep_scan', { word });

      let attempts = 0;
      const maxAttempts = 8;

      const interval = setInterval(async () => {
        attempts++;

        const res = await apiClient.post('/graph/context', { word });
        const { neighbors } = res.data;

        const currentNeighbors = get().neighbors;

        const currentPos = get().centerNode!.position;
        const layoutNeighbors = neighbors.map((n: any, index: number) => {
          const total = neighbors.length;
          const angle = (index / total) * Math.PI * 2;
          return {
            ...n,
            position: [currentPos[0] + 18 * Math.cos(angle), 0, currentPos[2] + 18 * Math.sin(angle)],
          };
        });

        set({ neighbors: layoutNeighbors });

        if (neighbors.length > currentNeighbors.length || attempts >= maxAttempts) {
          if (attempts >= maxAttempts) {
            set({ isScanning: false });
            clearInterval(interval);
          }
        }
      }, 2000);
    } catch (e) {
      console.error('Deep scan trigger failed', e);
      set({ isScanning: false });
    }
  },
  deleteCurrentNode: async () => {
    const { centerNode } = get();
    if (!centerNode) return;

    if (
      !window.confirm(
        `WARNING: Initiate Voidout for "${centerNode.id}"?\n此操作不可逆，将永久删除该节点及所有连接。`,
      )
    ) {
      return;
    }

    try {
      await apiClient.delete(`/node/${centerNode.id}`);
      await get().jumpTo('fernweh');
    } catch (e) {
      console.error('Voidout failed:', e);
      alert('销毁失败，数据残留。');
    }
  },
});
```

#### 15.10.3 Store 装配（initialState + slices）

```ts
// 功能: 统一装配 initialState 与各 slice，形成单一 useGameStore
// 文件: /Users/lijunyi/Code/Strand/frontend/src/store/store.ts
// 行号: L438-L461
// 关键逻辑:
// - 组合顺序决定 action 覆盖关系（同名键后者覆盖前者）
const initialState = {
  centerNode: null,
  neighbors: [],
  user: { level: 1, current_xp: 0, next_level_xp: 100 },
  missions: [],
  isScanning: false,
  isLinking: false,
  scanResult: null,
  activeNodeId: null,
  lastNarrative: null,
  hoveredNodeId: null,
  availableBooks: [],
  currentBook: null,
  bookProgress: 0,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,
  ...createUISlice(set),
  ...createMissionSlice(set, get),
  ...createUserSlice(set, get),
  ...createGraphSlice(set, get),
  ...createKnowledgeSlice(set, get),
}));
```

### 15.11 Electron 主进程：启动后端可执行文件并加载前端产物

```js
// 功能: Electron 主进程：创建窗口 + 启动后端二进制，并在退出时终止
// 文件: /Users/lijunyi/Code/Strand/electron-main.js
// 行号: L1-L51
// 关键逻辑:
// - loadFile(frontend/dist/index.html)
// - spawn(backend binary)
// - will-quit: kill backend
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#000000',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'frontend/dist/index.html'));
}

function startPythonBackend() {
  const isDev = !app.isPackaged;
  const script = isDev
    ? path.join(__dirname, 'backend/dist/strand-brain/strand-brain')
    : path.join(process.resourcesPath, 'strand-brain');
  pythonProcess = spawn(script);
  pythonProcess.stdout.on('data', (data) => console.log(`[Brain]: ${data}`));
}

app.on('will-quit', () => {
  if (pythonProcess) pythonProcess.kill('SIGINT');
});

app.whenReady().then(() => {
  startPythonBackend();
  createWindow();
});
```

### 15.12 一键启动脚本：同时启动前端与后端并输出日志

```bash
# 功能: 开发态一键启动：后端 uvicorn + 前端 vite，并将输出落到日志文件
# 文件: /Users/lijunyi/Code/Strand/start.sh
# 行号: L1-L28
# 关键逻辑:
# - uvicorn main:app --reload > backend.log
# - npm run dev > frontend.log
# - trap SIGINT 同时 kill 两个子进程
#!/bin/bash
echo "🚀 初始化 Strand 认知系统..."
echo "🧠 正在唤醒神经中枢 (Backend)..."
cd backend
source venv/bin/activate
uvicorn main:app --reload > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "📺 正在加载全息界面 (Frontend)..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT
wait
```

---

## 16. 项目总结报告

### 16.1 已完成的企业级进化项（本轮）

- **后端 API 路由解耦**：单体路由拆分为 v1 分域路由（graph/knowledge/mission/user），并保留兼容层入口。
- **LLM Provider 工厂化**：本地 Ollama 与云端 OpenAI-Compatible API 可切换。
- **前端 Store 切片化**：抽象统一 `apiClient`，并按领域组合 store。
- **双层蒸馏 RAG**：RAW 归档 + DISTILLED 作为检索原料，提升检索稳定性与可控性。

### 16.2 技术难点与解决方案（摘要）

- **路由拆分无侵入升级**：通过兼容层 re-export router，避免大量 import 迁移成本。
- **LLM 可插拔与性能演进**：统一 `invoke()` 语义，降低业务逻辑对 SDK/部署形态的耦合。
- **RAG 工业化输入**：用蒸馏把“噪音文档”转为“原子化知识点”，并明确 RAW/DISTILLED 两层数据治理边界。

### 16.3 当前指标（可复验）

- 后端：`pytest backend/tests` 全通过（含上传蒸馏链路测试）。
- 前端：`npx vitest run`、`npm run lint`、`npm run build` 均通过。

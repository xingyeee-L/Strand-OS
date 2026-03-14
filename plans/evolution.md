# Strand OS 企业级进化蓝图 (Evolution Roadmap)

## 0. 基线评估与验证 (Status & Verification)

> 目的：在不急于实现新计划前，先对照代码库现状验证“已完成项”是否成立，并记录已知偏差与遗留。

### 0.1 已完成项验证（2026-03-13）

- ✅ Backend（FastAPI + SQLModel）：
  - `python -m pytest -q backend/tests/test_api.py -vv` → **3 passed**
  - `VECTOR_STORE_DISABLED=1 DISTILL_MODE=heuristic python -m pytest -q backend/tests/test_knowledge_upload.py -vv` → **1 passed**
-  ✅ Backend（回归）：
  - `VECTOR_STORE_DISABLED=1 DISTILL_MODE=heuristic python -m pytest -q` → **6 passed**
  - `VECTOR_STORE_DISABLED=1 DISTILL_MODE=heuristic SEMANTIC_CHUNKING=1 python -m pytest -q` → **8 passed**
- ✅ Frontend（React + Zustand）：
  - `npx vitest run` → **3 passed**
  - `npm run lint` → **0 errors（存在 1 warning：react-hooks/exhaustive-deps）**
  - `npx vitest run && npm run lint && npm run build` → **通过**

### 0.3 评估框架（E4.1）快速跑通

- 评估数据集示例：`backend/eval/datasets/rag_eval.sample.jsonl`
- 离线模式（仅检索命中率，不调用 LLM）：
  - `VECTOR_STORE_DISABLED=1 python -m app.eval.run_ragas --dataset eval/datasets/rag_eval.sample.jsonl --seed`
- 输出 JSON 报告：
  - `VECTOR_STORE_DISABLED=1 python -m app.eval.run_ragas --dataset eval/datasets/rag_eval.sample.jsonl --seed --out eval/reports/report.json`

### 0.2 已知偏差（不阻塞、但需纳入后续任务）

- 前端对话框 [DialogueBar.tsx](file:///Users/lijunyi/Code/Strand/frontend/src/components/ui/DialogueBar.tsx) 当前以“输入单词→搜索候选→jumpTo”为主流程，**不是自由对话/多模态 Agent 入口**。
- DialogueBar 内存在 `axios` 直连与硬编码 `http://127.0.0.1:8000`（与“统一 apiClient”目标不一致），且使用 `// @ts-nocheck`（类型收敛不足）。

## 1. 任务清单 (TodoList)

### Phase 1: 骨架重构 (Structural Refactoring)
- [x] **R1.1: 后端 API 路由解耦** (拆分上帝文件 `endpoints.py`)
- [x] **R1.2: 引入 LLM Provider 工厂模式** (支持云端 API 与本地模型切换)
- [x] **R1.3: 前端 Store 切片与 API 客户端抽象** (解耦 Zustand 与 Axios)
- [x] **R1.4: 前端 API 调用收敛** (移除 UI 组件 axios 直连与硬编码 URL，统一走 `apiClient`)
- [x] **R1.5: 前端类型与规则收敛** (清理 `@ts-nocheck`，恢复关键组件类型边界)

### Phase 2: 数据治理与 RAG 进化 (Data & RAG Evolution)
- [x] **D2.1: 实现“知识蒸馏”双层架构** (Raw 原始层与 Distilled 精炼层)
- [x] **D2.2: 数据库模式演进 (Schemas v2)** (引入 `Source` 溯源表与强关联关系)
- [x] **D2.3: 引入混合检索 (Hybrid Search)** (向量检索 + BM25 关键词匹配)

### Phase 3: 性能与体验增强 (UX & Performance)
- [x] **P3.1: 实现 AI 流式响应 (Streaming)** (提升交互“战术感”)
- [x] **P3.2: 引入语义分块 (Semantic Chunking)** (优化 RAG 切片质量)
- [x] **P3.3: 3D 渲染性能优化** (Store 状态分层，减少 React 重绘)

### Phase 4: 工程化保障 (Production Readiness)
- [x] **E4.1: 构建全链路评估框架 (RAGAS)** (量化 RAG 准确率)
- [x] **E4.2: 环境配置与安全增强** (配置中心化与 API Key 保护)

### Phase 5: 谷歌生态与多模态 Agent (Google & Multimodal)
- [x] **G5.0: 对话框升级为 Agent 命令台** (从“输入单词”升级为自由对话/多模态统一入口)
- [x] **G5.1: 接入 GeminiProvider** (`llm_factory.py` 新增 GeminiProvider，默认模型切换至 Gemini)
- [x] **G5.2: 蒸馏链路 Prompt 调优** (`distiller.py` 适配 Gemini 稳定输出“原子化知识点”)
- [x] **G5.3: 上传直传 GCS** (`knowledge.py` 原始文件存储改为 GCS，并写入云端 URL)
- [x] **G5.4: 视觉分析 API** (新增 `/agent/vision_analyze`：Base64 截图 + 文本 → Gemini Vision 推理)
- [x] **G5.5: 前端 3D 截图采集** (R3F canvas 截图→Base64→发送后端)
- [x] **G5.6: 前端语音输入 STT** (Web Speech API：按住说话→实时转录→发送指令)
- [x] **G5.7: 前端语音播报 TTS** (原生 SpeechSynthesis：科幻音色/播报节奏/可打断)
- [x] **G5.8: Live Agent HUD 状态机** (Listening/Observing/Synthesizing/Speaking 状态指示与联动)
- [x] **G5.9: 截图“扫描/闪烁”视觉反馈** (发送截图时的短暂特效与动效时序)

## 3. 演进日志 (Evolution Log)

> 记录任务执行进度、决策记录与变更详情。

- **2026-03-13T12:15:00Z | v1.2.6 | feature | G5.6 & G5.7 音频交互增强**
  - **任务详情**: 集成 Web Speech API 实现 STT，并增强 TTS 播报控制。
  - **技术决策**: 
    - 使用 `window.webkitSpeechRecognition` 实现语音实时转录并同步至输入框。
    - 扩展 `AudioService` 支持 `pause/resume/stop`，并将 TTS 生命周期与 `agentState` (Speaking) 绑定。
  - **负责人**: AI Agent
  - **关键输出**: [AudioService.ts](file:///Users/lijunyi/Code/Strand/frontend/src/utils/AudioService.ts), [DialogueBar.tsx](file:///Users/lijunyi/Code/Strand/frontend/src/components/ui/DialogueBar.tsx)。
  - **耗时**: 20min
  - **风险**: 语音识别依赖浏览器权限与网络环境，TTS 在部分旧版浏览器可能存在语调偏差。

- **2026-03-13T11:45:00Z | v1.2.5 | feature | G5.0/5.8/5.9 Agent 状态机与命令台升级**
  - **任务详情**: 升级 `DialogueBar` 为全功能 Agent 命令台，引入 5 态状态机与视觉反馈。
  - **技术决策**: 
    - 在 Zustand Store 中引入 `agentState` 统一管理 `listening/observing/synthesizing/speaking/idle`。
    - 升级 `AIAvatar` 与 `HUD` 以响应状态变更。
    - 在 `Dashboard.tsx` 增加基于 `observing` 状态的 CSS 扫描线特效。
  - **负责人**: AI Agent
  - **关键输出**: [store.ts](file:///Users/lijunyi/Code/Strand/frontend/src/store/store.ts), [AIAvatar.tsx](file:///Users/lijunyi/Code/Strand/frontend/src/components/ui/AIAvatar.tsx), [DialogueBar.tsx](file:///Users/lijunyi/Code/Strand/frontend/src/components/ui/DialogueBar.tsx), [Dashboard.tsx](file:///Users/lijunyi/Code/Strand/frontend/src/pages/Dashboard.tsx)。
  - **耗时**: 30min
  - **风险**: 状态转换过于频繁可能导致 UI 闪烁，已增加 3s 自动复位延时。

- **2026-03-13T11:15:00Z | v1.2.4 | feature | G5.3 知识上传直传 GCS**
  - **任务详情**: 原始文件上传逻辑重构，支持 Google Cloud Storage。
  - **技术决策**: 
    - 引入 `google-cloud-storage` SDK。
    - 采用“GCS 优先，本地回退”策略，通过 `storage_uri` 统一记录 `gs://` 或本地路径。
  - **负责人**: AI Agent
  - **关键输出**: [knowledge.py](file:///Users/lijunyi/Code/Strand/backend/app/api/v1/endpoints/knowledge.py)。
  - **耗时**: 15min
  - **风险**: GCS 凭据失效时会自动降级到本地存储，需定期检查存储空间。

- **2026-03-13T11:00:00Z | v1.2.3 | feature | G5.4 & G5.5 视觉分析链路**
  - **任务详情**: 实现从 3D 画布截图并发送至后端进行 AI 视觉分析。
  - **技术决策**: 
    - 后端新增 [agent.py](file:///Users/lijunyi/Code/Strand/backend/app/api/v1/endpoints/agent.py) 路由，封装多模态 LLM 调用。
    - 前端在 `Dashboard.tsx` 开启 `preserveDrawingBuffer` 以支持截图，通过 `canvas.toDataURL` 采集 Base64。
  - **负责人**: AI Agent
  - **关键输出**: [agent.py](file:///Users/lijunyi/Code/Strand/backend/app/api/v1/endpoints/agent.py), [Dashboard.tsx](file:///Users/lijunyi/Code/Strand/frontend/src/pages/Dashboard.tsx), [DialogueBar.tsx](file:///Users/lijunyi/Code/Strand/frontend/src/components/ui/DialogueBar.tsx)。
  - **耗时**: 25min
  - **风险**: `preserveDrawingBuffer` 可能会对极低性能设备造成轻微负担。

- **2026-03-13T10:30:00Z | v1.2.2 | refactor | G5.2 蒸馏链路 Prompt 调优**
  - **任务详情**: 优化 `distiller.py` 的 LLM 提示词，并增加 Markdown 列表后置校验逻辑。
  - **技术决策**: 
    - 强制要求 LLM 输出以 `- ` 开头的列表，不满足时通过正则或后置处理修复。
    - 增加 [test_distiller.py](file:///Users/lijunyi/Code/Strand/backend/tests/test_distiller.py) 覆盖多种蒸馏模式。
  - **负责人**: AI Agent
  - **关键输出**: [distiller.py](file:///Users/lijunyi/Code/Strand/backend/app/services/distiller.py), [test_distiller.py](file:///Users/lijunyi/Code/Strand/backend/tests/test_distiller.py)。
  - **耗时**: 15min
  - **风险**: LLM 输出极度异常时可能回退到原始文本，需监控 RAG 质量。

- **2026-03-13T10:15:00Z | v1.2.1 | feature | G5.1 接入 GeminiProvider**
  - **任务详情**: 在 `llm_factory.py` 中新增 `GeminiProvider`，基于 `langchain-google-genai` 实现。
  - **技术决策**: 
    - 统一 `invoke` 接口，支持 `LLM_TYPE=gemini`。
    - 引入 `ChatGoogleGenerativeAI` 封装，确保 stop token 行为一致。
  - **负责人**: AI Agent
  - **关键输出**: [llm_factory.py](file:///Users/lijunyi/Code/Strand/backend/app/core/llm_factory.py)。
  - **耗时**: 10min
  - **风险**: 需要有效的 `GOOGLE_API_KEY`，否则会抛出 `ValueError`。

- **2026-03-13T10:00:00Z | v1.2.0 | feature | E4.2 环境配置与安全增强**
  - **任务详情**: 完成配置中心化 (Pydantic Settings)、CORS 动态配置与日志脱敏过滤器。
  - **技术决策**: 
    - 引入 `pydantic-settings` 统一管理环境变量，支持 `.env` 文件。
    - 在 [logging.py](file:///Users/lijunyi/Code/Strand/backend/app/core/logging.py) 中实现正则脱敏过滤器，保护 API Key 等敏感信息。
  - **负责人**: AI Agent
  - **关键输出**: [config.py](file:///Users/lijunyi/Code/Strand/backend/app/core/config.py), [logging.py](file:///Users/lijunyi/Code/Strand/backend/app/core/logging.py), [.env.example](file:///Users/lijunyi/Code/Strand/backend/.env.example)。
  - **耗时**: 15min
  - **风险**: 环境变量缺失可能导致启动失败，已提供 [env.example](file:///Users/lijunyi/Code/Strand/backend/.env.example) 示例。

---

## 2. 专业重构提示词 (AI Prompts)

### R1.1: 后端路由解耦
> 作为资深后端架构师，请重构 Strand 项目的 API 层。目前 `endpoints.py` 过于臃肿。请在 `backend/app/api/` 下建立 `v1/` 目录，并按照领域驱动设计（DDD）将其拆分为 `graph.py` (图谱交互)、`knowledge.py` (RAG 逻辑)、`mission.py` (任务系统) 和 `user.py` (用户画像)。确保使用 `APIRouter` 进行挂载，并保持原有接口路径不变，实现逻辑从 API 层向 Service 层的下沉。

### R1.2: LLM Provider 工厂化
> 请为 Strand 后端构建一个 LLM Provider 抽象层。在 `app/core/` 下创建 `llm_factory.py`，定义一个统一的 `BaseLLMProvider` 接口。实现 `OllamaProvider` (本地) 和 `CloudAPIProvider` (兼容 OpenAI 协议)。支持通过 `.env` 中的 `LLM_TYPE` 动态切换模型源，并为后续接入 DeepSeek/Claude 做好协议兼容。重构 `brain.py` 使其不再直接依赖特定模型库。

### D2.1 & D2.2: 知识蒸馏架构与 Schema 升级
> 请重构 Strand 的 RAG 摄取流程。在 `data/` 下建立 `raw_archive/` 和 `distilled_brain/` 文件夹。修改 `schemas.py` 增加 `Source` 表用于追踪原始文件。更新 `KnowledgeFragment` 模型，增加 `fragment_type` (RAW/DISTILLED) 标识。实现一个新的 Service 逻辑：当用户上传文件时，先存储原始版本，随后调用 LLM 将内容蒸馏为精简、原子化的知识点存入精炼层，并仅对精炼层进行向量索引。

### R1.3: 前端 Store 切片化
> 作为前端架构专家，请对 Strand 的 `store.ts` 进行切片重构。目前 `useGameStore` 职责过于宽泛。请将其拆分为 `useGraphStore` (3D 交互)、`useUserStore` (XP/等级) 和 `useMissionStore` (任务流程)。同时，在 `src/services/` 下封装独立的 `apiClient.ts`，将所有 `axios` 调用从 Store 中抽离，确保状态管理层只处理纯净的数据状态。

### P3.1: AI 流式响应 (Streaming)
> 请为 Strand 的 AI 响应实现 Streaming 流式传输。后端需修改 FastAPI 接口返回 `StreamingResponse` (Server-Sent Events)；前端需在 `store.ts` 中实现对流数据的分片接收，并配合 `AIAvatar` 组件实现打字机效果。确保在高并发生成时，前端 UI 依然保持流畅，不会因为大段文字返回而卡顿。

### G5.1: 集成 GeminiProvider（Google GenAI）
> 请在 `backend/app/core/llm_factory.py` 中新增 `GeminiProvider`，基于 `langchain-google-genai` 接入 Google Gemini。要求：
> 1) 支持 `LLM_TYPE=gemini` 选择 Provider；保留现有 `ollama/openai` 行为
> 2) 默认模型使用 `gemini-1.5-pro` 或 `gemini-2.5-flash`（通过环境变量覆盖）
> 3) 统一 `invoke(prompt, stop)` 语义，确保 stop token 在 Gemini 返回后可稳定截断
> 4) 环境变量设计：`GOOGLE_API_KEY`、`GEMINI_MODEL`、`GEMINI_TEMPERATURE`、`GEMINI_TIMEOUT`
> 5) 失败降级：当 Gemini 不可用时，明确抛出可诊断错误（不要静默吞掉）

### G5.2: Gemini 蒸馏 Prompt 调优（可解析输出）
> 请调优 `backend/app/services/distiller.py` 的 LLM 蒸馏 Prompt，使 Gemini 输出满足以下解析规则：
> - 输出严格为 Markdown 列表（每行以 `- ` 开头），禁止标题/解释/前后缀
> - 要点数量 5-12 条；每条 1-2 句；保留专有名词/数字/公式符号
> - 遇到输入过短时，返回 3-5 条，并显式补全上下文（但仍保持要点风格）
> 并补充单测：给定固定输入，断言输出每行以 `- ` 开头且条目数量在范围内。

### G5.3: 知识上传直传 GCS（RAW 上云 + DB 记录 URL）
> 请重构 `backend/app/api/v1/endpoints/knowledge.py` 的 `/knowledge/upload`：
> 1) 原始文件不再落盘到 `data/raw_archive`，改为上传至 GCS Bucket（服务账号或 API Key 方式）
> 2) 将 `gs://bucket/key` 或 HTTPS URL 写入数据库（新增字段建议在 D2.2 schema v2 实现，如 `source_url` / `raw_url`）
> 3) 本地仅生成蒸馏文本（Distilled），并继续写入向量索引
> 4) 支持配置：`GCS_BUCKET`、`GCS_PREFIX`、`GOOGLE_APPLICATION_CREDENTIALS`
> 5) 安全：禁止在日志输出完整密钥；对文件名做清洗，避免路径穿越

### G5.4 & G5.5: 视觉分析链路（截图→Gemini Vision）
> 请实现多模态视觉链路：
> - 前端：在 R3F 渲染层增加截图能力（优先 `canvas.toDataURL("image/png")`；必要时再评估 html2canvas），将图片压缩/裁剪后转 Base64
> - 后端：新增 `POST /agent/vision_analyze`，接收 `{ image_base64, text }`，调用 Gemini 视觉模型进行推理，并返回结构化结果（例如 `{ summary, suggestions, detected_nodes? }`）
> 要求：限制 Base64 大小、增加输入校验、返回可用于 UI 展示的字段，并为失败情况返回稳定错误码。

### G5.6 & G5.7: 音频交互（STT + TTS）
> 请在前端实现“按住说话”的语音输入与语音播报：
> - STT：优先 Web Speech API（注意权限、浏览器兼容、降级策略），实时转录为文本后调用现有后端接口
> - TTS：使用 SpeechSynthesis，将后端回复分句播报；支持“可打断/暂停/继续”
> 同时新增一个 Agent 状态机：Listening→Synthesizing→Speaking，并与 UI/HUD 组件联动。

### G5.8 & G5.9: Live Agent HUD 与视觉反馈
> 请在前端主界面新增 Agent HUD 悬浮窗，并实现如下状态指示灯：

### G5.0: 对话框升级为 Agent 命令台（自由对话 + 多模态统一入口）
> 现状：对话框主要用于“输入单词→搜索候选→jumpTo”，不支持自由对话与多模态指令。
> 目标：将对话框升级为统一的 Agent 命令台，支持以下能力：
> 1) 自由对话（Text Chat）：新增后端 `POST /agent/chat`，前端输入可直接对话并保留上下文（短期：无状态；中期：会话 ID）
> 2) 指令路由（Command Router）：在前端将用户输入识别为 `jump/search/chat/vision/audio` 等意图并路由到相应接口
> 3) 多模态统一（Vision/Audio）：截图与语音转文本均作为“同一会话”的 message 输入，输出走同一渲染与 TTS 播报链路
> 4) 兼容旧功能：保留单词 jumpTo 的快速路径（例如以 `/jump word` 或自动识别单词意图）
> 5) 状态机联动：与 G5.8 Live Agent HUD 共享状态（Listening/Observing/Synthesizing/Speaking）
> [🔴 Listening] → [👁️ Observing] → [🧠 Synthesizing] → [🔊 Speaking]
> 当用户触发截图分析时，增加短暂“屏幕扫描/闪烁”特效，并确保动效时序与状态机一致（避免状态跳变导致闪烁错乱）。

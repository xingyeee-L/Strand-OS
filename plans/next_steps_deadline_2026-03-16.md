# Strand 最后 3 天冲刺指引（截止：PT 3/16 17:00）

> 目标：停止 feature creep，把时间投入到“稳定性 + 叙事 + 合规证明 + 演示视频”四件事上。

---

## 0) 一页总清单（必须完成）

- 合规：
  - [ ] Gemini 正在被使用（LLM_TYPE=gemini）
  - [ ] Gemini 调用来自 Google GenAI SDK（google-genai）而非其它封装
  - [ ] 至少一项 Google Cloud 服务：GCS（已接入）并在演示中展示（或部署证明中展示）
- 部署：
  - [ ] 后端部署到 Cloud Run（可公开访问或带简单鉴权）
  - [ ] Cloud Run Logs 能在录屏中展示滚动日志
- 稳定性：
  - [ ] 前端 build 通过，后端 pytest 通过
  - [ ] 视觉接口在 429/网络错误时给出清晰提示（不要“无响应”）
- 演示：
  - [ ] 4 分钟“真机录屏”（No Mockups）
  - [ ] 结构图（Frontend → Cloud Run → Gemini + GCS）放入 Devpost/README
  - [ ] README 跑通（评委能在 2 分钟内启动）

---

## 1) 第 1 天（今天）：部署 + 合规证明一键齐活

### 1.1 准备 GCP 资源（15–30 分钟）

- 创建/确认：
  - 一个 GCP Project
  - 一个 GCS Bucket（比如 `strand-raw-archive-<id>`）
- 本地登录并设置项目：

```bash
gcloud auth login
gcloud config set project <YOUR_GCP_PROJECT_ID>
```

### 1.2 部署 Backend 到 Cloud Run（30–60 分钟）

后端已具备容器化（`backend/Dockerfile`）。

```bash
gcloud run deploy strand-backend \
  --source ./backend \
  --region <REGION> \
  --allow-unauthenticated \
  --set-env-vars LLM_TYPE=gemini,GOOGLE_API_KEY=***,GCS_BUCKET=***,GCS_PREFIX=raw_archive
```

部署后得到 Cloud Run URL：
- 把它填入前端环境变量：`VITE_BACKEND_URL=<CLOUD_RUN_URL>`
- 用该 URL 验证这些接口：
  - `GET /` 健康检查
  - `POST /agent/chat`（Gemini 文本）
  - `POST /agent/vision_analyze`（Gemini 视觉）
  - `POST /knowledge/upload`（上传，确认写入 GCS）

### 1.3 录“部署证明”素材（10–15 分钟）

满足邮件里的“最简单证明法”：
- 打开 Google Cloud Console → Cloud Run → 你的服务 → **Logs**
- 录屏 10–20 秒，确保日志滚动、服务状态是绿色
- 备用证明：
  - README 中放 `google-genai` 与 `google-cloud-storage` 的代码链接（评委可点击）

---

## 2) 第 2 天：演示脚本 + Wow Moment（多模态）

### 2.1 选赛道定位（你们最像哪个）

- UI Navigators（推荐）：强调“它真的能看见屏幕截图并给出操作/探索建议”
- Live Agents：强调可打断（目前偏弱，除非你们已验证 Gemini Live/ADK）
- Creative Storytellers：强调输出是一个连续多媒体流（当前偏弱，除非要做媒体拼接）

### 2.2 建议演示剧本（4 分钟模板）

**00:00–00:20 立意（The Pitch）**
- 讲清：解决什么问题（词汇/知识在脑中“可视化 + 可探索 + 可复盘”）

**00:20–01:10 基础能力（图谱探索）**
- 搜索一个词 → 展示节点与邻居关系 → 点链接生成叙事

**01:10–02:40 Wow Moment（多模态）**
- 直接点 OBSERVE → 截图 → Gemini 视觉分析 → 输出总结与建议
- 强调：这是对 UI 的“看见”，不是纯聊天

**02:40–03:30 记忆与云服务（GCS）**
- 上传一个小 txt/pdf（演示全局记忆注入）
- 口播：会写入 GCS（Google Cloud 服务）

**03:30–04:00 收尾**
- 展示 HUD 状态、任务面板（复习/探索）
- 给评委一句“下一步”：Mission v2 / 更强的策略层

### 2.3 必做排练清单（避免翻车）

- 每个演示步骤都准备“备选输入”：词、上传文件、图谱状态
- 网络不稳时的备用方案：
  - Cloud Run 仍可用
  - Gemini 配额不足时 UI 能提示（不要卡死）

---

## 3) 第 3 天：打磨 README + 架构图 + 提交材料

### 3.1 README 最小体验（评委 2 分钟体验）

- 必须清晰写出：
  - 前端怎么启动
  - 后端怎么启动 / 或 Cloud Run URL 怎么填
  - 必需环境变量（GOOGLE_API_KEY、GCS_BUCKET）

### 3.2 架构图（评委最爱）

建议图中只保留 5 块：

```text
Frontend (React/R3F)
   |
   | HTTPS
   v
Backend (FastAPI on Cloud Run)
   |               \
   | GenAI SDK      \ GCS
   v                 v
Gemini (text+vision)  Google Cloud Storage
```

输出格式：
- PNG（放 Devpost 图库/README）
- 可选：把同一张图作为演示视频中的一页过场（不算 mockup，因为系统真在跑）

### 3.3 提交前回归（最后一次）

- 本地：
  - `backend`: `pytest`
  - `frontend`: `lint + vitest + build`
- 线上：
  - Cloud Run URL 打开健康检查
  - OBSERVE 跑通一次
  - upload 跑通一次（确保 GCS 写入）

---

## 4) 当前项目与邮件要求的差距（需要你确认/补齐）

- ADK / Gemini Live：
  - 如果你选择 **Live Agents** 赛道：还需要用 Gemini Live API 或 ADK 做“可打断”能力证明
  - 如果你选择 **UI Navigators**：不强制 Live，只要视觉“看见”链路稳定即可
- GCP 部署证明：
  - 本仓库已补齐 Cloud Run Dockerfile 与 README 指引
  - 你仍需要完成一次真实部署并录证明（最重要）

---

## 5) 风险控制（避免最后一刻翻车）

- 冻结功能：除非是“演示必需的稳定性修复”，否则不再加功能
- 预案：Gemini 429 时 UI 提示 + fallback 文本建议（不要 spinner 永转）
- 录屏前重启：保证数据库状态干净、前端缓存正常


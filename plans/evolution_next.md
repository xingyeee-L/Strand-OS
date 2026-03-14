# Strand OS 下一阶段演进蓝图 (vNext)

**版本**: v1.3.0  
**时间**: 2026-03-14T00:00:00Z  
**范围**: 命令台输入分流、任务系统升级、多模态可靠性与测试体系

---

## 0. 背景与目标

### 0.1 现状痛点

- 命令台输入框同时承担“单词检索候选”和“自由对话”，聊天时容易触发候选与误跳转（误触）。
- 任务系统当前基于 `MissionLog`（每日 + type + JSON 目标词），缺少：
  - 任务项级别的状态（每个目标词的完成/失败/跳过）
  - 可追溯的历史、复盘、跨日连续任务、任务规则版本化
  - 更清晰的“生成策略”与“执行记录”分离（可测试、可演进）
- 多模态视觉分析强依赖 Gemini 配额；当配额耗尽时，用户体验缺少稳定降级路径。

### 0.2 本阶段目标

- 输入体验：把“搜索候选/跳转”和“对话/指令”在交互层面稳定分流，降低误触率。
- 任务系统：把“任务定义 / 任务执行 / 任务项状态”拆分到可扩展的结构，支持未来引入 Agent 生成任务、任务模板与评估。
- 可靠性：配额/网络异常时，明确提示 + 可用降级，避免“无响应”。

---

## 1. 已落地的快速修复 (Hotfix)

- [x] **UX1: 输入分流防误触（规则 + 键位）**
  - 搜索候选仅在“单词形态输入”触发（正则 gating）
  - Enter 默认发送对话；Shift+Enter 或 Tab 才会执行候选跳转
  - 参考实现：[DialogueBar.tsx](file:///Users/lijunyi/Code/Strand/frontend/src/components/ui/DialogueBar.tsx)

---

## 2. 待办任务清单 (v1.3.0)

### Phase A: 命令台输入体验 (Command UX)

- [ ] **A1: 输入模式显式化（Search / Chat Toggle）**
  - UI 增加模式切换：Search 模式才渲染候选；Chat 模式完全禁用候选
  - 默认 Auto：仍保留正则 gating，但当用户主动切换后固定模式
  - 验收：连续 30 次自由对话输入，不触发误跳转；Search 模式候选稳定可用

- [ ] **A2: 指令路由扩展**
  - 标准化命令：`/jump`、`/search`、`/chat`、`/vision`、`/stt`、`/tts`
  - 验收：命令解析覆盖率单测 + UI 提示准确

### Phase B: 任务系统升级 (Mission System v2)

#### B1: 数据模型 v2（替换 MissionLog 的 JSON 目标词）

- [ ] **B1.1: 引入 Mission / MissionItem 表**
  - Mission：`id, date, type, status, xp_reward, policy_version, created_at`
  - MissionItem：`id, mission_id, word_id, status, completed_at, meta_json`
  - 保留 MissionLog 作为迁移期兼容（只读），逐步淘汰
  - 验收：SQLModel migration + 基础 CRUD 单测

#### B2: API v2（更细粒度状态）

- [ ] **B2.1: /missions/today 返回任务与任务项**
  - 返回结构：Mission + items（每个 item 带 status）
- [ ] **B2.2: /missions/{id}/items/{item_id}/complete**
  - 完成单词 -> 更新 item 状态 -> 触发 XP/SRS/笔记写入（复用现有逻辑）
- [ ] **B2.3: /missions/{id}/regenerate**
  - 重新生成未完成任务项（可按策略/词书/难度）
  - 验收：后端 pytest 覆盖 + 回归不破坏旧接口

#### B3: 生成策略与可测试性

- [ ] **B3.1: 策略层抽象（MissionPolicy）**
  - 将“每日配额、review/explore 比例、extra 任务规则”抽象为策略对象
  - 支持 policy 版本化（policy_version 写入 Mission）
  - 验收：同一输入条件下 deterministic（可注入 seed）且可单测

#### B4: 前端任务体验升级

- [ ] **B4.1: MissionBoard 基于 MissionItem 状态渲染**
  - 不再依赖 `WordNode.last_review` 推断完成
  - 验收：任务项完成后 UI 秒级刷新，进度条准确

- [ ] **B4.2: 任务复盘与历史**
  - 显示最近 N 天任务完成率、最常错词、复习间隔趋势

### Phase C: 多模态可靠性 (Reliability)

- [ ] **C1: Gemini 状态可观测性**
  - 后端新增 `/agent/status`：返回当前 provider、模型名、最近一次错误类型（不含敏感信息）
  - 前端 HUD 展示 “QUOTA / DEGRADED” 等状态

- [ ] **C2: 视觉分析降级策略**
  - 当 `vision_analyze` 返回 429：改为“非视觉建议”输出（基于当前中心词、邻居、任务状态生成建议）
  - 验收：无配额时仍能给出稳定建议（可用于 UI 展示）

---

## 3. 测试与验收 (v1.3.0)

- 单测：MissionPolicy、MissionItem 状态机、输入路由解析、候选选择键位
- 集成：/missions API v2 全链路（生成 -> 完成 item -> XP/SRS -> UI 更新）
- 回归：确保 `/missions/daily` 等旧接口在迁移期继续可用（或提供清晰弃用窗口）


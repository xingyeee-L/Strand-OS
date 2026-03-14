
# Strand OS v1.2.6 全链路测试方案

本方案旨在验证 Strand OS v1.2.6 版本中，从工程化配置到多模态 Agent 交互的全链路功能是否符合预期。

## 一、 测试前的准备工作

在开始全面测试之前，请确保以下环境配置已完成：

1.  **配置后端环境变量**:
    *   在后端根目录 `/Users/lijunyi/Code/Strand/backend` 下，根据 `.env.example` 创建一个名为 `.env` 的文件。
    *   **[必需]** 在 `.env` 文件中，填入您的 `GOOGLE_API_KEY`，以启用 Gemini 视觉分析和对话功能。
        ```env
        LLM_TYPE=gemini
        GOOGLE_API_KEY="AIza..."
        ```
    *   **[可选]** 若需测试文件直传 Google Cloud Storage (GCS) 功能，请配置 GCS 相关变量。如果留空，文件将自动保存到本地 `data/raw_archive` 目录。
        ```env
        GCS_BUCKET="your-gcs-bucket-name"
        # GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/credentials.json"
        ```

2.  **安装/更新后端依赖**:
    *   确保 `langchain-google-genai` 和 `google-cloud-storage` 等新依赖已安装。
    ```bash
    cd /Users/lijunyi/Code/Strand/backend
    source venv/bin/activate
    pip install -r requirements.txt
    ```

3.  **启动应用**:
    *   **后端**: `cd /Users/lijunyi/Code/Strand/backend && source venv/bin/activate && uvicorn main:app --reload`
    *   **前端**: `cd /Users/lijunyi/Code/Strand/frontend && npm run dev`

4.  **授予浏览器权限**:
    *   首次使用“语音输入”功能时，浏览器会请求麦克风使用权限，请点击“允许”。

## 二、 端到端测试用例

| 测试模块 | 任务 ID | 测试步骤 | 预期结果 |
| :--- | :--- | :--- | :--- |
| **1. 工程化与安全** | E4.2 | 1. 检查后端启动日志。 <br> 2. 确认日志中没有打印任何 API Key 或完整凭据路径。 | 1. 后端服务基于 `.env` 配置（如 `LLM_TYPE=gemini`）正常启动。 <br> 2. 敏感信息被 `******` 替代。 |
| **2. 核心 Agent 对话** | G5.0 | 1. 在对话框输入任意文本（非命令），按回车。 <br> 2. 观察 HUD 和左侧 AI 头像。 | 1. AI 给出回应，并以打字机效果显示。 <br> 2. 状态机依次变为 `Synthesizing` -> `Speaking` -> `Idle`，颜色与动画匹配。 |
| **3. 视觉分析链路** | G5.4/5.5/5.9 | 1. 在 3D 视图中，点击右下角的 **OBSERVE** 按钮。 <br> 2. 观察屏幕特效与 AI 状态。 | 1. 屏幕出现短暂的“扫描/闪烁”特效。 <br> 2. AI 状态变为 `Observing` -> `Synthesizing` -> `Speaking`。 <br> 3. AI 对当前 3D 视图给出分析和建议。 |
| **4. 语音交互** | G5.6/G5.7 | 1. 点击对话框右侧的**麦克风图标**，开始说话。 <br> 2. 再次点击图标停止。 <br> 3. 按回车发送识别出的文本。 | 1. 说话时，AI 状态变为 `Listening`，图标呈红色脉冲状。 <br> 2. 输入框实时显示语音转录的文本。 <br> 3. AI 的回复会被自动语音播报，同时状态变为 `Speaking`。 |
| **5. 知识上传** | G5.3 | 1. 点击顶部目标词区域的**上传按钮**。 <br> 2. 选择一个 `.txt` 或 `.pdf` 文件。 <br> 3. （需配置 GCS）检查您的 GCS Bucket。 | 1. 文件上传成功，AI 开始进行知识蒸馏。 <br> 2. 如果配置了 GCS，文件会出现在指定的 Bucket 中。 <br> 3. 如果未配置 GCS，文件会出现在后端的 `data/raw_archive` 目录。 |
| **6. 蒸馏质量** | G5.2 | 1. 上传一份包含多段落的文本文件。 <br> 2. 在数据库 `knowledgefragment` 表中查找 `fragment_type` 为 `DISTILLED` 的记录。 | 1. 对应 `source_id` 的蒸馏知识点被创建。 <br> 2. 每条知识点都以 `- ` 开头，格式规整。 |
| **7. 兼容性与回退** | R1.4 | 1. 在对话框中输入 `/jump fernweh`。 <br> 2. 在对话框中输入一个单词（如 `apple`）进行模糊搜索。 | 1. `/jump` 命令能正确跳转到指定节点。 <br> 2. 模糊搜索功能正常，下拉列表显示候选词。 |

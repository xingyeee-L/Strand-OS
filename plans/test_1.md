一、 系统工程与安全基线
编号	测试模块	任务 ID	测试步骤	预期结果	实际结果(P/F)
1.1	配置与安全启动	E4.2	1. 启动后端服务，观察控制台启动日志。<br>2. 检索日志内容，检查敏感字段（API Key、完整凭据路径等）。	1. 后端服务成功基于 .env 配置（如 LLM_TYPE=gemini）初始化并启动。<br>2. 日志中无明文密钥泄露，所有敏感信息均被 ****** 正确脱敏替代。	[ t]
二、 核心交互与对话系统 (文本 & 语音 & 命令)
编号	测试模块	任务 ID	测试步骤	预期结果	实际结果(P/F)
2.1	基础文本对话	G5.0	1. 在主界面对话框输入任意普通文本（非命令），按回车发送。<br>2. 观察左侧 AI 头像状态机及 HUD 界面响应。	1. 状态机依次按 Synthesizing -> Speaking -> Idle 流转，且颜色与动画匹配准确。<br>2. AI 给出回应，界面以“打字机特效”流畅显示文本。	
// 界面变化但是没有回应流出

2.2	命令与模糊搜索	R1.4	1. 在对话框输入快捷指令 /jump fernweh 并回车。<br>2. 清空后，输入单一单词（如 apple）触发搜索。	1. 系统识别 /jump 命令，正确跳转至指定 3D 节点/场景。<br>2. 模糊搜索功能正常触发，对话框上方或下方弹出候选词下拉列表。	
//测试通过，完全符合预期
2.3	语音识别与播报	G5.6/G5.7	1. 点击对话框右侧麦克风图标，开始进行语音输入。<br>2. 观察图标变化并再次点击停止录音。<br>3. 检查输入框转录文字并按回车发送。	1. 录音期间：AI 状态变为 Listening，麦克风图标呈红色脉冲闪烁。<br>2. 录音结束：输入框实时/准确显示 STT (语音转文本) 的内容。<br>3. 发送后：状态变为 Speaking，系统自动播放 TTS (文本转语音) 语音回应。	[ ]
//录音正常，实时显示文字，但是发送后得不到回应
三、 空间感知与视觉链路
编号	测试模块	任务 ID	测试步骤	预期结果	实际结果(P/F)
3.1	3D 视觉分析	G5.4/5.5/5.9	1. 在 3D 视图场景下，点击右下角 OBSERVE（观察）按钮。<br>2. 观察屏幕整体特效、AI 状态变化及最终回复内容。	1. 视觉表现：屏幕出现短暂的“扫描/闪烁”科幻特效。<br>2. 状态流转：AI 状态依次变为 Observing -> Synthesizing -> Speaking。<br>3. 业务逻辑：AI 能够结合当前 3D 视图的具体画面内容，给出准确的上下文分析与建议。	[ ]
//提示视觉分析失败，请检查网络或配置。
四、 知识库与数据流 (RAG 链路)
编号	测试模块	任务 ID	测试步骤	预期结果	实际结果(P/F)
4.1	多模态文件上传	G5.3	1. 点击顶部目标词区域的上传按钮。<br>2. 选择有效文本文件（.txt 或 .pdf）并确认上传。<br>3. 检查存储介质（GCS 控制台或本地目录）。	1. 前端提示上传成功，AI 后台触发“知识蒸馏”任务。<br>2. 云端分支：若配置了 GCS，文件成功落库至指定的 Bucket。<br>3. 本地分支：若未配置 GCS，文件成功保存至后端 data/raw_archive 目录。	[ ]
//前端未提示上传成功
4.2	知识蒸馏质量	G5.2	1. 执行用例 4.1（建议上传包含多段落、具有逻辑层级的文本）。<br>2. 登录数据库，查询 knowledgefragment 表中 fragment_type = 'DISTILLED' 的最新记录。	1. 关联刚才上传文件 source_id 的蒸馏记录被成功创建。<br>2. 提取的数据格式规整，每条知识点均按规范以 - (破折号+空格) 开头，无明显乱码或截断。
//未成功
接下来我会粘贴后端日志：source /Users/lijunyi/Code/Strand/.venv/bin/activate
/Users/lijunyi/.openclaw/completions/openclaw.zsh:3803: command not found: compdef

(TraeAI-5) ~/Code/Strand [0] $ source /Users/lijunyi/Code/Strand/.venv/bin/activa
te

(TraeAI-5) ~/Code/Strand [0] $  cd /Users/lijunyi/Code/Strand/backend && source v
env/bin/activate && pytest tests
============================== test session starts ==============================
platform darwin -- Python 3.11.9, pytest-9.0.2, pluggy-1.6.0
rootdir: /Users/lijunyi/Code/Strand/backend
plugins: anyio-4.12.0, langsmith-0.5.0, asyncio-1.3.0
asyncio: mode=Mode.STRICT, debug=False, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
collected 0 items                                                               
[SYSTEM] Database Path: /Users/lijunyi/Code/Strand/data/strand.db
 source /Users/lijunyi/Code/Strand/.venv/bin/activate

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! KeyboardInterrupt !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
<frozen importlib._bootstrap_external>:1131: KeyboardInterrupt
(to show a full traceback on KeyboardInterrupt use --full-trace)
============================= no tests ran in 3.51s =============================

(TraeAI-5) ~/Code/Strand/backend [2] $  source /Users/lijunyi/Code/Strand/.venv/b
in/activate

(TraeAI-5) ~/Code/Strand/backend [0] $  trae-sandbox 'cd /Users/lijunyi/Code/Stra
nd/backend && source venv/bin/activate && VECTOR_STORE_DISABLED=1 DISTILL_MODE=he
uristic python -m pytest -q'
......                                                                    [100%]
6 passed in 3.89s

(TraeAI-5) ~/Code/Strand/backend [0] $  trae-sandbox 'cd /Users/lijunyi/Code/Stra
nd/backend && source venv/bin/activate && VECTOR_STORE_DISABLED=1 DISTILL_MODE=he
uristic SEMANTIC_CHUNKING=1 python -m pytest -q'
........                                                                  [100%]
8 passed in 3.34s

(TraeAI-5) ~/Code/Strand/backend [0] $  trae-sandbox 'cd /Users/lijunyi/Code/Stra
nd/backend && source venv/bin/activate && VECTOR_STORE_DISABLED=1 DISTILL_MODE=he
uristic SEMANTIC_CHUNKING=1 python -m pytest -q'
........                                                                  [100%]
8 passed in 3.41s

(TraeAI-5) ~/Code/Strand/backend [0] $  trae-sandbox 'cd /Users/lijunyi/Code/Stra
nd/backend && source venv/bin/activate && VECTOR_STORE_DISABLED=1 DISTILL_MODE=he
uristic SEMANTIC_CHUNKING=1 python -m pytest -q'
.........                                                                 [100%]
9 passed in 3.26s

(TraeAI-5) ~/Code/Strand/backend [0] $  trae-sandbox 'cd /Users/lijunyi/Code/Stra
nd/backend && source venv/bin/activate && VECTOR_STORE_DISABLED=1 python -m pytes
t -q'
.........                                                                 [100%]
9 passed in 3.29s

(TraeAI-5) ~/Code/Strand/backend [0] $  builtin setopt HIST_IGNORE_SPACE
 export SAFE_RM_ALLOWED_PATH="/Users/lijunyi/Code/Strand" SAFE_RM_DENIED_PATH="/Users/lijunyi/Code/Strand/.vscode:/Users/lijunyi/Code/Strand/.trae:/Users/lijunyi/Code/Strand/.git" SAFE_RM_AUTO_ADD_TEMP="1" SAFE_RM_PROTECTION_FLAG="/tmp/safe-rm-protection-flag-ac5efc5f-1456-42fa-af3f-1024fc986349" SAFE_RM_SOURCE_FLAG="/tmp/safe-rm-source-flag-efad36db-3d57-4c7b-a672-283727f8fba3" TRAE_SANDBOX_SOURCE_FLAG_PATH="/tmp/sandbox-source-flag-5436ce16-4f9e-4de2-8aa2-227a5c1194c8" TRAE_SANDBOX_CLI_PATH="/Applications/Trae.app/Contents/Resources/app/modules/sandbox/trae-sandbox" TRAE_SANDBOX_STORAGE_PATH="/Users/lijunyi/Library/Application Support/Trae/ModularData/ai-agent/sandbox" TRAE_SANDBOX_CONFIG_NAME="69b3beb14dbce42858a82e1b" TRAE_SANDBOX_LOG_DIR="/Users/lijunyi/Library/Application Support/Trae/logs/20260311T120151/Modular" TRAE_SANDBOX_DUMP_DIR="/Users/lijunyi/Library/Application Support/Trae/Crashpad/sandbox-pending" TRAE_SANDBOX_TRACE_FILE="/tmp/trae_sandbox_trace_01881a02-402 export SAFE_RM_ALLOWED_PATH="/U; %                                                                                                       

(TraeAI-5) ~/Code/Strand/backend [0] $ >....                                                                                                 AE_SANDBOX_SOURCE_FLAG_PATH="/tmp/sandbox-source-flag-5436ce16-4f9e-4de2-8aa2-227a5c1194c8" TRAE_SANDBOX_CLI_PATH="/Applications/Trae.app/Contents/Resources/app/modules/sandbox/trae-sandbox" TRAE_SANDBOX_STORAGE_PATH="/Users/lijunyi/Library/Application Support/Trae/ModularData/ai-agent/sandbox" TRAE_SANDBOX_CONFIG_NAME="69b3beb14dbce42858a82e1b" TRAE_SANDBOX_LOG_DIR="/Users/lijunyi/Library/Application Support/Trae/logs/20260311T120151/Modular" TRAE_SANDBOX_DUMP_DIR="/Users/lijunyi/Library/Application Support/Trae/Crashpad/sandbox-pending" TRAE_SANDBOX_TRACE_FILE="/tmp/trae_sandbox_trace_01881a02-402 export SAFE_RM_ALLOWED_PATH="/U;  trae-sandbox 'cd /Users/lijunyi/Code/Strand/backend && source ve
nv/bin/activate && uvicorn main:app --reload --host 127.0.0.1 --port 8000'
INFO:     Will watch for changes in these directories: ['/Users/lijunyi/Code/Strand/backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [26451] using WatchFiles
[SYSTEM] Database Path: /Users/lijunyi/Code/Strand/data/strand.db
Process SpawnProcess-1:
Traceback (most recent call last):
  File "/Users/lijunyi/Code/Strand/backend/app/core/llm_factory.py", line 88, in __init__
    from langchain_google_genai import ChatGoogleGenerativeAI
ModuleNotFoundError: No module named 'langchain_google_genai'

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/Library/Frameworks/Python.framework/Versions/3.11/lib/python3.11/multiprocessing/process.py", line 314, in _bootstrap
    self.run()
  File "/Library/Frameworks/Python.framework/Versions/3.11/lib/python3.11/multiprocessing/process.py", line 108, in run
    self._target(*self._args, **self._kwargs)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/_subprocess.py", line 80, in subprocess_started
    target(sockets=sockets)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/server.py", line 67, in run
    return asyncio_run(self.serve(sockets=sockets), loop_factory=self.config.get_loop_factory())
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/_compat.py", line 30, in asyncio_run
    return runner.run(main)
           ^^^^^^^^^^^^^^^^
  File "/Library/Frameworks/Python.framework/Versions/3.11/lib/python3.11/asyncio/runners.py", line 118, in run
    return self._loop.run_until_complete(task)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "uvloop/loop.pyx", line 1518, in uvloop.loop.Loop.run_until_complete
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/server.py", line 71, in serve
    await self._serve(sockets)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/server.py", line 78, in _serve
    config.load()
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/config.py", line 439, in load
    self.loaded_app = import_from_string(self.app)
                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/importer.py", line 19, in import_from_string
    module = importlib.import_module(module_str)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Library/Frameworks/Python.framework/Versions/3.11/lib/python3.11/importlib/__init__.py", line 126, in import_module
    return _bootstrap._gcd_import(name[level:], package, level)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<frozen importlib._bootstrap>", line 1204, in _gcd_import
  File "<frozen importlib._bootstrap>", line 1176, in _find_and_load
  File "<frozen importlib._bootstrap>", line 1147, in _find_and_load_unlocked
  File "<frozen importlib._bootstrap>", line 690, in _load_unlocked
  File "<frozen importlib._bootstrap_external>", line 940, in exec_module
  File "<frozen importlib._bootstrap>", line 241, in _call_with_frames_removed
  File "/Users/lijunyi/Code/Strand/backend/main.py", line 7, in <module>
    from app.api.endpoints import router
  File "/Users/lijunyi/Code/Strand/backend/app/api/endpoints.py", line 1, in <module>
    from app.api.v1.api import router
  File "/Users/lijunyi/Code/Strand/backend/app/api/v1/api.py", line 3, in <module>
    from app.api.v1.endpoints.graph import router as graph_router
  File "/Users/lijunyi/Code/Strand/backend/app/api/v1/endpoints/graph.py", line 23, in <module>
    from app.services.brain import BrainService
  File "/Users/lijunyi/Code/Strand/backend/app/services/brain.py", line 18, in <module>
    llm = get_llm()
          ^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/app/core/llm_factory.py", line 128, in get_llm
    _provider = GeminiProvider()
                ^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/app/core/llm_factory.py", line 96, in __init__
    raise ImportError("Please install 'langchain-google-genai' to use GeminiProvider")
ImportError: Please install 'langchain-google-genai' to use GeminiProvider

(TraeAI-5) ~/Code/Strand/backend [143] $ INFO:     Stopping reloader process [26451]


(TraeAI-5) ~/Code/Strand/backend [130] $ 

(TraeAI-5) ~/Code/Strand/backend [130] $  trae-sandbox 'cd /Users/lijunyi/Code/Strand/backend && source venv/bin/activate && uvicorn main:app
 --reload --host 127.0.0.1 --port 8000'
INFO:     Will watch for changes in these directories: ['/Users/lijunyi/Code/Strand/backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [28423] using WatchFiles
[SYSTEM] Database Path: /Users/lijunyi/Code/Strand/data/strand.db
INFO:     Started server process [28433]
INFO:     Waiting for application startup.
[SYSTEM] Logging initialized with desensitization filters.
[SYSTEM] Initializing Strand OS Brain v1.2.0...
[SYSTEM] Database Ready.
INFO:     Application startup complete.
INFO:     127.0.0.1:56188 - "OPTIONS /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56190 - "OPTIONS /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56189 - "GET /user/profile HTTP/1.1" 200 OK
Building prefix dict from the default dictionary ...
INFO:     127.0.0.1:56191 - "GET /user/profile HTTP/1.1" 200 OK
2026-03-14 01:07:21,741 [DEBUG] jieba: Building prefix dict from the default dictionary ...
Loading model from cache /var/folders/6j/g2px910s7gsc0m93rtxxrcnh0000gn/T/jieba.cache
2026-03-14 01:07:21,741 [DEBUG] jieba: Loading model from cache /var/folders/6j/g2px910s7gsc0m93rtxxrcnh0000gn/T/jieba.cache
Loading model cost 0.273 seconds.
2026-03-14 01:07:22,015 [DEBUG] jieba: Loading model cost 0.273 seconds.
Prefix dict has been built successfully.
2026-03-14 01:07:22,015 [DEBUG] jieba: Prefix dict has been built successfully.
[SYSTEM] Loading Embedding Model...
[SYSTEM] Loading Embedding Model...
2026-03-14 01:07:22,121 [INFO] sentence_transformers.SentenceTransformer: Use pytorch device_name: mps
2026-03-14 01:07:22,121 [INFO] sentence_transformers.SentenceTransformer: Load pretrained SentenceTransformer: sentence-transformers/all-MiniLM-L6-v2
2026-03-14 01:07:22,122 [INFO] sentence_transformers.SentenceTransformer: Use pytorch device_name: mps
2026-03-14 01:07:22,122 [INFO] sentence_transformers.SentenceTransformer: Load pretrained SentenceTransformer: sentence-transformers/all-MiniLM-L6-v2
INFO:     127.0.0.1:56190 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56190 - "POST /missions/generate HTTP/1.1" 200 OK
INFO:     127.0.0.1:56190 - "GET /missions/daily HTTP/1.1" 200 OK
2026-03-14 01:07:26,726 [INFO] chromadb.telemetry.product.posthog: Anonymized telemetry enabled. See                     https://docs.trychroma.com/telemetry for more information.
INFO:     127.0.0.1:56188 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56188 - "POST /missions/generate HTTP/1.1" 200 OK
INFO:     127.0.0.1:56188 - "GET /missions/daily HTTP/1.1" 200 OK
INFO:     127.0.0.1:56279 - "OPTIONS /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56281 - "OPTIONS /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56280 - "GET /user/profile HTTP/1.1" 200 OK
INFO:     127.0.0.1:56282 - "GET /user/profile HTTP/1.1" 200 OK
INFO:     127.0.0.1:56279 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56281 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56281 - "POST /missions/generate HTTP/1.1" 200 OK
INFO:     127.0.0.1:56281 - "POST /missions/generate HTTP/1.1" 200 OK
INFO:     127.0.0.1:56279 - "GET /missions/daily HTTP/1.1" 200 OK
INFO:     127.0.0.1:56281 - "GET /missions/daily HTTP/1.1" 200 OK
INFO:     127.0.0.1:56455 - "GET /search/hints?q=s+t+ran HTTP/1.1" 200 OK
INFO:     127.0.0.1:56455 - "GET /search/hints?q=strand HTTP/1.1" 200 OK
INFO:     127.0.0.1:56470 - "GET /user/profile HTTP/1.1" 200 OK
INFO:     127.0.0.1:56455 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56470 - "GET /search/hints?q=strand HTTP/1.1" 200 OK
INFO:     127.0.0.1:56470 - "GET /search/hints?q=strandzhe HTTP/1.1" 200 OK
INFO:     127.0.0.1:56470 - "GET /search/hints?q=strand%E8%BF%99%E4%B8%AA HTTP/1.1" 200 OK
INFO:     127.0.0.1:56470 - "GET /search/hints?q=strand%E8%BF%99%E4%B8%AA%E5%8D%95%E8%AF%8D HTTP/1.1" 200 OK
INFO:     127.0.0.1:56470 - "GET /search/hints?q=strand%E8%BF%99%E4%B8%AA%E5%8D%95%E8%AF%8D%E6%9C%89%E4%BB%80%E4%B9%88 HTTP/1.1" 200 OK
INFO:     127.0.0.1:56470 - "GET /search/hints?q=strand%E8%BF%99%E4%B8%AA%E5%8D%95%E8%AF%8D%E6%9C%89%E4%BB%80%E4%B9%88te+shu+han+yi+ma HTTP/1.1" 200 OK
INFO:     127.0.0.1:56470 - "OPTIONS /agent/chat HTTP/1.1" 200 OK
2026-03-14 01:09:50,937 [INFO] google_genai.models: AFC is enabled with max remote calls: 10.
2026-03-14 01:09:51,363 [INFO] httpx: HTTP Request: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent "HTTP/1.1 404 Not Found"
INFO:     127.0.0.1:56470 - "POST /agent/chat HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_google_genai/chat_models.py", line 3047, in _generate
    response: GenerateContentResponse = self.client.models.generate_content(
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/models.py", line 5709, in generate_content
    response = self._generate_content(
               ^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/models.py", line 4371, in _generate_content
    response = self._api_client.request(
               ^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/_api_client.py", line 1401, in request
    response = self._request(http_request, http_options, stream=False)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/_api_client.py", line 1235, in _request
    return retry(self._request_once, http_request, stream)  # type: ignore[no-any-return]
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 477, in __call__
    do = self.iter(retry_state=retry_state)
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 378, in iter
    result = action(retry_state)
             ^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 400, in <lambda>
    self._add_action_func(lambda rs: rs.outcome.result())
                                     ^^^^^^^^^^^^^^^^^^^
  File "/Library/Frameworks/Python.framework/Versions/3.11/lib/python3.11/concurrent/futures/_base.py", line 449, in result
    return self.__get_result()
           ^^^^^^^^^^^^^^^^^^^
  File "/Library/Frameworks/Python.framework/Versions/3.11/lib/python3.11/concurrent/futures/_base.py", line 401, in __get_result
    raise self._exception
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 480, in __call__
    result = fn(*args, **kwargs)
             ^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/_api_client.py", line 1214, in _request_once
    errors.APIError.raise_for_response(response)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/errors.py", line 134, in raise_for_response
    cls.raise_error(response.status_code, response_json, response)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/errors.py", line 159, in raise_error
    raise ClientError(status_code, response_json, response)
google.genai.errors.ClientError: 404 NOT_FOUND. {'error': {'code': 404, 'message': 'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.', 'status': 'NOT_FOUND'}}

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/protocols/http/httptools_impl.py", line 416, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/middleware/proxy_headers.py", line 60, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/applications.py", line 1135, in __call__
    await super().__call__(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/applications.py", line 107, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/errors.py", line 186, in __call__
    raise exc
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/errors.py", line 164, in __call__
    await self.app(scope, receive, _send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/cors.py", line 93, in __call__
    await self.simple_response(scope, receive, send, request_headers=headers)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/cors.py", line 144, in simple_response
    await self.app(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/exceptions.py", line 63, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/middleware/asyncexitstack.py", line 18, in __call__
    await self.app(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/routing.py", line 716, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/routing.py", line 736, in app
    await route.handle(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/routing.py", line 290, in handle
    await self.app(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 119, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 105, in app
    response = await f(request)
               ^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 426, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 312, in run_endpoint_function
    return await dependant.call(**values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/app/api/v1/endpoints/agent.py", line 69, in agent_chat
    response = llm.invoke(req.text)
               ^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/app/core/llm_factory.py", line 103, in invoke
    return self._llm.invoke(prompt).content
           ^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_google_genai/chat_models.py", line 2535, in invoke
    return super().invoke(input, config, stop=stop, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_core/language_models/chat_models.py", line 398, in invoke
    self.generate_prompt(
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_core/language_models/chat_models.py", line 1117, in generate_prompt
    return self.generate(prompt_messages, stop=stop, callbacks=callbacks, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_core/language_models/chat_models.py", line 927, in generate
    self._generate_with_cache(
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_core/language_models/chat_models.py", line 1221, in _generate_with_cache
    result = self._generate(
             ^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_google_genai/chat_models.py", line 3051, in _generate
    _handle_client_error(e, request)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_google_genai/chat_models.py", line 145, in _handle_client_error
    raise ChatGoogleGenerativeAIError(msg) from e
langchain_google_genai.chat_models.ChatGoogleGenerativeAIError: Error calling model 'gemini-1.5-flash' (NOT_FOUND): 404 NOT_FOUND. {'error': {'code': 404, 'message': 'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.', 'status': 'NOT_FOUND'}}
INFO:     127.0.0.1:56514 - "GET /search/hints?q=strand%E8%BF%99%E4%B8%AA%E5%8D%95%E8%AF%8D%E6%9C%89%E4%BB%80%E4%B9%88%E7%89%B9%E6%AE%8A%E5%90%AB%E4%B9%89%E5%90%97 HTTP/1.1" 200 OK
INFO:     127.0.0.1:56527 - "GET /search/hints?q=ni+h HTTP/1.1" 200 OK
INFO:     127.0.0.1:56527 - "GET /search/hints?q=%E4%BD%A0%E5%A5%BD HTTP/1.1" 200 OK
INFO:     127.0.0.1:56554 - "GET /user/profile HTTP/1.1" 200 OK
INFO:     127.0.0.1:56527 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56527 - "GET /search/hints?q=%E4%BD%A0%E5%A5%BD HTTP/1.1" 200 OK
INFO:     127.0.0.1:56527 - "GET /search/hints?q=%E4%BD%A0%E5%A5%BDa HTTP/1.1" 200 OK
INFO:     127.0.0.1:56527 - "GET /search/hints?q=%E4%BD%A0%E5%A5%BD%E5%95%8A HTTP/1.1" 200 OK
INFO:     127.0.0.1:56593 - "GET /search/hints?q=%E4%BD%A0%E5%A5%BD%E5%95%8Aa HTTP/1.1" 200 OK
INFO:     127.0.0.1:56593 - "GET /search/hints?q=%E4%BD%A0%E5%A5%BD%E5%95%8A HTTP/1.1" 200 OK
INFO:     127.0.0.1:56593 - "GET /search/hints?q=%E4%BD%A0%E5%A5%BD%E5%95%8A%EF%BC%8Czai HTTP/1.1" 200 OK
INFO:     127.0.0.1:56593 - "GET /search/hints?q=%E4%BD%A0%E5%A5%BD%E5%95%8A%EF%BC%8Czai+ga HTTP/1.1" 200 OK
INFO:     127.0.0.1:56593 - "GET /search/hints?q=%E4%BD%A0%E5%A5%BD%E5%95%8A%EF%BC%8Czai+gan+ma HTTP/1.1" 200 OK
INFO:     127.0.0.1:56593 - "GET /search/hints?q=%E4%BD%A0%E5%A5%BD%E5%95%8A%EF%BC%8C%E5%9C%A8%E5%B9%B2%E5%98%9B HTTP/1.1" 200 OK
2026-03-14 01:10:22,739 [INFO] google_genai.models: AFC is enabled with max remote calls: 10.
2026-03-14 01:10:23,158 [INFO] httpx: HTTP Request: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent "HTTP/1.1 404 Not Found"
INFO:     127.0.0.1:56593 - "POST /agent/chat HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_google_genai/chat_models.py", line 3047, in _generate
    response: GenerateContentResponse = self.client.models.generate_content(
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/models.py", line 5709, in generate_content
    response = self._generate_content(
               ^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/models.py", line 4371, in _generate_content
    response = self._api_client.request(
               ^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/_api_client.py", line 1401, in request
    response = self._request(http_request, http_options, stream=False)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/_api_client.py", line 1235, in _request
    return retry(self._request_once, http_request, stream)  # type: ignore[no-any-return]
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 477, in __call__
    do = self.iter(retry_state=retry_state)
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 378, in iter
    result = action(retry_state)
             ^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 400, in <lambda>
    self._add_action_func(lambda rs: rs.outcome.result())
                                     ^^^^^^^^^^^^^^^^^^^
  File "/Library/Frameworks/Python.framework/Versions/3.11/lib/python3.11/concurrent/futures/_base.py", line 449, in result
    return self.__get_result()
           ^^^^^^^^^^^^^^^^^^^
  File "/Library/Frameworks/Python.framework/Versions/3.11/lib/python3.11/concurrent/futures/_base.py", line 401, in __get_result
    raise self._exception
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 480, in __call__
    result = fn(*args, **kwargs)
             ^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/_api_client.py", line 1214, in _request_once
    errors.APIError.raise_for_response(response)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/errors.py", line 134, in raise_for_response
    cls.raise_error(response.status_code, response_json, response)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/errors.py", line 159, in raise_error
    raise ClientError(status_code, response_json, response)
google.genai.errors.ClientError: 404 NOT_FOUND. {'error': {'code': 404, 'message': 'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.', 'status': 'NOT_FOUND'}}

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/protocols/http/httptools_impl.py", line 416, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/middleware/proxy_headers.py", line 60, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/applications.py", line 1135, in __call__
    await super().__call__(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/applications.py", line 107, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/errors.py", line 186, in __call__
    raise exc
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/errors.py", line 164, in __call__
    await self.app(scope, receive, _send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/cors.py", line 93, in __call__
    await self.simple_response(scope, receive, send, request_headers=headers)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/cors.py", line 144, in simple_response
    await self.app(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/exceptions.py", line 63, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/middleware/asyncexitstack.py", line 18, in __call__
    await self.app(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/routing.py", line 716, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/routing.py", line 736, in app
    await route.handle(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/routing.py", line 290, in handle
    await self.app(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 119, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 105, in app
    response = await f(request)
               ^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 426, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 312, in run_endpoint_function
    return await dependant.call(**values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/app/api/v1/endpoints/agent.py", line 69, in agent_chat
    response = llm.invoke(req.text)
               ^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/app/core/llm_factory.py", line 103, in invoke
    return self._llm.invoke(prompt).content
           ^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_google_genai/chat_models.py", line 2535, in invoke
    return super().invoke(input, config, stop=stop, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_core/language_models/chat_models.py", line 398, in invoke
    self.generate_prompt(
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_core/language_models/chat_models.py", line 1117, in generate_prompt
    return self.generate(prompt_messages, stop=stop, callbacks=callbacks, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_core/language_models/chat_models.py", line 927, in generate
    self._generate_with_cache(
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_core/language_models/chat_models.py", line 1221, in _generate_with_cache
    result = self._generate(
             ^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_google_genai/chat_models.py", line 3051, in _generate
    _handle_client_error(e, request)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_google_genai/chat_models.py", line 145, in _handle_client_error
    raise ChatGoogleGenerativeAIError(msg) from e
langchain_google_genai.chat_models.ChatGoogleGenerativeAIError: Error calling model 'gemini-1.5-flash' (NOT_FOUND): 404 NOT_FOUND. {'error': {'code': 404, 'message': 'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.', 'status': 'NOT_FOUND'}}
INFO:     127.0.0.1:56640 - "OPTIONS /agent/vision_analyze HTTP/1.1" 200 OK
2026-03-14 01:10:25,593 [INFO] google_genai.models: AFC is enabled with max remote calls: 10.
2026-03-14 01:10:25,945 [INFO] httpx: HTTP Request: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent "HTTP/1.1 404 Not Found"
[Vision Error] Error calling model 'gemini-1.5-flash' (NOT_FOUND): 404 NOT_FOUND. {'error': {'code': 404, 'message': 'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.', 'status': 'NOT_FOUND'}}
INFO:     127.0.0.1:56640 - "POST /agent/vision_analyze HTTP/1.1" 500 Internal Server Error
INFO:     127.0.0.1:56666 - "OPTIONS /mission/complete_word HTTP/1.1" 200 OK
2026-03-14 01:10:31,984 [INFO] google_genai.models: AFC is enabled with max remote calls: 10.
2026-03-14 01:10:32,388 [INFO] httpx: HTTP Request: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent "HTTP/1.1 404 Not Found"
INFO:     127.0.0.1:56666 - "POST /mission/complete_word HTTP/1.1" 200 OK
INFO:     127.0.0.1:56666 - "GET /missions/daily HTTP/1.1" 200 OK
INFO:     127.0.0.1:56666 - "GET /user/profile HTTP/1.1" 200 OK
INFO:     127.0.0.1:56688 - "OPTIONS /node/deep_scan HTTP/1.1" 200 OK
INFO:     127.0.0.1:56688 - "POST /node/deep_scan HTTP/1.1" 200 OK
[Background Worker] Starting Deep Scan: 你好
2026-03-14 01:10:38,347 [INFO] google_genai.models: AFC is enabled with max remote calls: 10.
2026-03-14 01:10:38,757 [INFO] httpx: HTTP Request: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent "HTTP/1.1 404 Not Found"
2026-03-14 01:10:38,865 [INFO] google_genai.models: AFC is enabled with max remote calls: 10.
2026-03-14 01:10:39,014 [INFO] httpx: HTTP Request: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent "HTTP/1.1 404 Not Found"
⚠️ [LLM Judge Error] 采用向量召回前3名作为兜底: Error calling model 'gemini-1.5-flash' (NOT_FOUND): 404 NOT_FOUND. {'error': {'code': 404, 'message': 'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.', 'status': 'NOT_FOUND'}}
[Background Worker] Deep Scan for 你好 COMPLETED.
INFO:     127.0.0.1:56688 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56688 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56688 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56688 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56688 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56688 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56688 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56688 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56736 - "GET /user/profile HTTP/1.1" 200 OK
INFO:     127.0.0.1:56735 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56735 - "OPTIONS /link/stream HTTP/1.1" 200 OK
2026-03-14 01:11:03,626 [INFO] google_genai.models: AFC is enabled with max remote calls: 10.
2026-03-14 01:11:04,022 [INFO] httpx: HTTP Request: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent "HTTP/1.1 404 Not Found"
INFO:     127.0.0.1:56735 - "POST /link/stream HTTP/1.1" 200 OK
INFO:     127.0.0.1:56771 - "GET /user/profile HTTP/1.1" 200 OK
INFO:     127.0.0.1:56770 - "POST /graph/context HTTP/1.1" 200 OK
2026-03-14 01:11:14,865 [INFO] google_genai.models: AFC is enabled with max remote calls: 10.
2026-03-14 01:11:15,246 [INFO] httpx: HTTP Request: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent "HTTP/1.1 404 Not Found"
INFO:     127.0.0.1:56770 - "POST /link/stream HTTP/1.1" 200 OK
2026-03-14 01:11:20,126 [INFO] google_genai.models: AFC is enabled with max remote calls: 10.
2026-03-14 01:11:20,269 [INFO] httpx: HTTP Request: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent "HTTP/1.1 404 Not Found"
INFO:     127.0.0.1:56770 - "POST /link/stream HTTP/1.1" 200 OK
INFO:     127.0.0.1:56770 - "GET /search/hints?q=a+d+s HTTP/1.1" 200 OK
INFO:     127.0.0.1:56770 - "GET /search/hints?q=%E5%AE%89%E5%BE%B7%E6%A3%AE HTTP/1.1" 200 OK
INFO:     127.0.0.1:56770 - "GET /search/hints?q=%E5%AE%89%E5%BE%B7%E6%A3%AEf HTTP/1.1" 200 OK
INFO:     127.0.0.1:56770 - "GET /search/hints?q=%E5%AE%89%E5%BE%B7%E6%A3%AEfe HTTP/1.1" 200 OK
INFO:     127.0.0.1:56770 - "GET /search/hints?q=%E5%AE%89%E5%BE%B7%E6%A3%AE%E5%88%86 HTTP/1.1" 200 OK
2026-03-14 01:11:29,512 [INFO] google_genai.models: AFC is enabled with max remote calls: 10.
2026-03-14 01:11:29,917 [INFO] httpx: HTTP Request: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent "HTTP/1.1 404 Not Found"
INFO:     127.0.0.1:56770 - "POST /agent/chat HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_google_genai/chat_models.py", line 3047, in _generate
    response: GenerateContentResponse = self.client.models.generate_content(
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/models.py", line 5709, in generate_content
    response = self._generate_content(
               ^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/models.py", line 4371, in _generate_content
    response = self._api_client.request(
               ^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/_api_client.py", line 1401, in request
    response = self._request(http_request, http_options, stream=False)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/_api_client.py", line 1235, in _request
    return retry(self._request_once, http_request, stream)  # type: ignore[no-any-return]
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 477, in __call__
    do = self.iter(retry_state=retry_state)
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 378, in iter
    result = action(retry_state)
             ^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 400, in <lambda>
    self._add_action_func(lambda rs: rs.outcome.result())
                                     ^^^^^^^^^^^^^^^^^^^
  File "/Library/Frameworks/Python.framework/Versions/3.11/lib/python3.11/concurrent/futures/_base.py", line 449, in result
    return self.__get_result()
           ^^^^^^^^^^^^^^^^^^^
  File "/Library/Frameworks/Python.framework/Versions/3.11/lib/python3.11/concurrent/futures/_base.py", line 401, in __get_result
    raise self._exception
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 480, in __call__
    result = fn(*args, **kwargs)
             ^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/_api_client.py", line 1214, in _request_once
    errors.APIError.raise_for_response(response)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/errors.py", line 134, in raise_for_response
    cls.raise_error(response.status_code, response_json, response)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/errors.py", line 159, in raise_error
    raise ClientError(status_code, response_json, response)
google.genai.errors.ClientError: 404 NOT_FOUND. {'error': {'code': 404, 'message': 'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.', 'status': 'NOT_FOUND'}}

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/protocols/http/httptools_impl.py", line 416, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/middleware/proxy_headers.py", line 60, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/applications.py", line 1135, in __call__
    await super().__call__(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/applications.py", line 107, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/errors.py", line 186, in __call__
    raise exc
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/errors.py", line 164, in __call__
    await self.app(scope, receive, _send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/cors.py", line 93, in __call__
    await self.simple_response(scope, receive, send, request_headers=headers)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/cors.py", line 144, in simple_response
    await self.app(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/exceptions.py", line 63, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/middleware/asyncexitstack.py", line 18, in __call__
    await self.app(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/routing.py", line 716, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/routing.py", line 736, in app
    await route.handle(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/routing.py", line 290, in handle
    await self.app(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 119, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 105, in app
    response = await f(request)
               ^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 426, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 312, in run_endpoint_function
    return await dependant.call(**values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/app/api/v1/endpoints/agent.py", line 69, in agent_chat
    response = llm.invoke(req.text)
               ^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/app/core/llm_factory.py", line 103, in invoke
    return self._llm.invoke(prompt).content
           ^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_google_genai/chat_models.py", line 2535, in invoke
    return super().invoke(input, config, stop=stop, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_core/language_models/chat_models.py", line 398, in invoke
    self.generate_prompt(
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_core/language_models/chat_models.py", line 1117, in generate_prompt
    return self.generate(prompt_messages, stop=stop, callbacks=callbacks, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_core/language_models/chat_models.py", line 927, in generate
    self._generate_with_cache(
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_core/language_models/chat_models.py", line 1221, in _generate_with_cache
    result = self._generate(
             ^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_google_genai/chat_models.py", line 3051, in _generate
    _handle_client_error(e, request)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_google_genai/chat_models.py", line 145, in _handle_client_error
    raise ChatGoogleGenerativeAIError(msg) from e
langchain_google_genai.chat_models.ChatGoogleGenerativeAIError: Error calling model 'gemini-1.5-flash' (NOT_FOUND): 404 NOT_FOUND. {'error': {'code': 404, 'message': 'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.', 'status': 'NOT_FOUND'}}
INFO:     127.0.0.1:56849 - "GET /user/profile HTTP/1.1" 200 OK
INFO:     127.0.0.1:56851 - "GET /user/profile HTTP/1.1" 200 OK
INFO:     127.0.0.1:56848 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56850 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56850 - "POST /missions/generate HTTP/1.1" 200 OK
INFO:     127.0.0.1:56850 - "POST /missions/generate HTTP/1.1" 200 OK
INFO:     127.0.0.1:56850 - "GET /missions/daily HTTP/1.1" 200 OK
INFO:     127.0.0.1:56850 - "GET /missions/daily HTTP/1.1" 200 OK
INFO:     127.0.0.1:56961 - "GET /user/profile HTTP/1.1" 200 OK
INFO:     127.0.0.1:56963 - "GET /user/profile HTTP/1.1" 200 OK
INFO:     127.0.0.1:56961 - "GET /user/profile HTTP/1.1" 200 OK
INFO:     127.0.0.1:56967 - "GET /user/profile HTTP/1.1" 200 OK
INFO:     127.0.0.1:56963 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56966 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:56966 - "POST /missions/generate HTTP/1.1" 200 OK
INFO:     127.0.0.1:56963 - "POST /missions/generate HTTP/1.1" 200 OK
INFO:     127.0.0.1:56963 - "GET /missions/daily HTTP/1.1" 200 OK
INFO:     127.0.0.1:56963 - "GET /missions/daily HTTP/1.1" 200 OK
INFO:     127.0.0.1:57158 - "GET /search/hints?q=%2Fji HTTP/1.1" 200 OK
INFO:     127.0.0.1:57158 - "GET /search/hints?q=%2Fji+m HTTP/1.1" 200 OK
INFO:     127.0.0.1:57158 - "GET /search/hints?q=%2Fj HTTP/1.1" 200 OK
INFO:     127.0.0.1:57158 - "GET /search/hints?q=%2Fju+m HTTP/1.1" 200 OK
INFO:     127.0.0.1:57158 - "GET /search/hints?q=%2Fjump HTTP/1.1" 200 OK
INFO:     127.0.0.1:57204 - "GET /user/profile HTTP/1.1" 200 OK
INFO:     127.0.0.1:57158 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:57204 - "GET /search/hints?q=jump HTTP/1.1" 200 OK
INFO:     127.0.0.1:57204 - "GET /search/hints?q=j+ump HTTP/1.1" 200 OK
INFO:     127.0.0.1:57204 - "GET /search/hints?q=jump HTTP/1.1" 200 OK
INFO:     127.0.0.1:57204 - "GET /search/hints?q=ump HTTP/1.1" 200 OK
INFO:     127.0.0.1:57204 - "GET /search/hints?q=jump HTTP/1.1" 200 OK
INFO:     127.0.0.1:57204 - "GET /search/hints?q=ump HTTP/1.1" 200 OK
INFO:     127.0.0.1:57204 - "GET /search/hints?q=%2Fump HTTP/1.1" 200 OK
INFO:     127.0.0.1:57204 - "GET /search/hints?q=%2Fjump HTTP/1.1" 200 OK
INFO:     127.0.0.1:57204 - "GET /search/hints?q=%2Fjump HTTP/1.1" 200 OK
INFO:     127.0.0.1:57204 - "GET /search/hints?q=%2Fjump+fe HTTP/1.1" 200 OK
INFO:     127.0.0.1:57204 - "GET /search/hints?q=%2Fjump+fer HTTP/1.1" 200 OK
INFO:     127.0.0.1:57204 - "GET /search/hints?q=%2Fjump+ferwe HTTP/1.1" 200 OK
INFO:     127.0.0.1:57204 - "GET /search/hints?q=%2Fjump+ferweh HTTP/1.1" 200 OK
INFO:     127.0.0.1:57307 - "GET /user/profile HTTP/1.1" 200 OK
2026-03-14 01:14:52,518 [INFO] google_genai.models: AFC is enabled with max remote calls: 10.
2026-03-14 01:14:52,927 [INFO] httpx: HTTP Request: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent "HTTP/1.1 404 Not Found"
INFO:     127.0.0.1:57204 - "POST /graph/context HTTP/1.1" 200 OK
INFO:     127.0.0.1:57530 - "GET /search/hints?q=%E4%BD%A0%E5%A5%BD HTTP/1.1" 200 OK
INFO:     127.0.0.1:57546 - "GET /search/hints?q=%E6%88%91%E6%83%B3 HTTP/1.1" 200 OK
INFO:     127.0.0.1:57546 - "GET /search/hints?q=%E6%88%91%E6%83%B3%E5%AF%B9%E4%BD%A0%E8%AF%B4 HTTP/1.1" 200 OK
2026-03-14 01:17:19,636 [INFO] google_genai.models: AFC is enabled with max remote calls: 10.
2026-03-14 01:17:20,048 [INFO] httpx: HTTP Request: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent "HTTP/1.1 404 Not Found"
INFO:     127.0.0.1:57546 - "POST /agent/chat HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_google_genai/chat_models.py", line 3047, in _generate
    response: GenerateContentResponse = self.client.models.generate_content(
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/models.py", line 5709, in generate_content
    response = self._generate_content(
               ^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/models.py", line 4371, in _generate_content
    response = self._api_client.request(
               ^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/_api_client.py", line 1401, in request
    response = self._request(http_request, http_options, stream=False)
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/_api_client.py", line 1235, in _request
    return retry(self._request_once, http_request, stream)  # type: ignore[no-any-return]
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 477, in __call__
    do = self.iter(retry_state=retry_state)
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 378, in iter
    result = action(retry_state)
             ^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 400, in <lambda>
    self._add_action_func(lambda rs: rs.outcome.result())
                                     ^^^^^^^^^^^^^^^^^^^
  File "/Library/Frameworks/Python.framework/Versions/3.11/lib/python3.11/concurrent/futures/_base.py", line 449, in result
    return self.__get_result()
           ^^^^^^^^^^^^^^^^^^^
  File "/Library/Frameworks/Python.framework/Versions/3.11/lib/python3.11/concurrent/futures/_base.py", line 401, in __get_result
    raise self._exception
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/tenacity/__init__.py", line 480, in __call__
    result = fn(*args, **kwargs)
             ^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/_api_client.py", line 1214, in _request_once
    errors.APIError.raise_for_response(response)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/errors.py", line 134, in raise_for_response
    cls.raise_error(response.status_code, response_json, response)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/google/genai/errors.py", line 159, in raise_error
    raise ClientError(status_code, response_json, response)
google.genai.errors.ClientError: 404 NOT_FOUND. {'error': {'code': 404, 'message': 'models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.', 'status': 'NOT_FOUND'}}

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/protocols/http/httptools_impl.py", line 416, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/uvicorn/middleware/proxy_headers.py", line 60, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/applications.py", line 1135, in __call__
    await super().__call__(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/applications.py", line 107, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/errors.py", line 186, in __call__
    raise exc
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/errors.py", line 164, in __call__
    await self.app(scope, receive, _send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/cors.py", line 93, in __call__
    await self.simple_response(scope, receive, send, request_headers=headers)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/cors.py", line 144, in simple_response
    await self.app(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/middleware/exceptions.py", line 63, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/middleware/asyncexitstack.py", line 18, in __call__
    await self.app(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/routing.py", line 716, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/routing.py", line 736, in app
    await route.handle(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/routing.py", line 290, in handle
    await self.app(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 119, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/starlette/_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 105, in app
    response = await f(request)
               ^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 426, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/fastapi/routing.py", line 312, in run_endpoint_function
    return await dependant.call(**values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/app/api/v1/endpoints/agent.py", line 69, in agent_chat
    response = llm.invoke(req.text)
               ^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/app/core/llm_factory.py", line 103, in invoke
    return self._llm.invoke(prompt).content
           ^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_google_genai/chat_models.py", line 2535, in invoke
    return super().invoke(input, config, stop=stop, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_core/language_models/chat_models.py", line 398, in invoke
    self.generate_prompt(
  File "/Users/lijunyi/Code/Strand/backend/venv/lib/python3.11/site-packages/langchain_core/language_models/chat_models.py", line 1117, in generate_prompt
    return self.generate(prompt_messages, stop=stop, callbacks=callbacks, **kwargs)
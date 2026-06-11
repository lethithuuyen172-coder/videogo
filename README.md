# AI带货视频工厂 V2.0

依据 `终极PRD_完整版.md` 与 `Codex开发指令.md` 落地的全栈工程。项目采用前后端分层：后端 FastAPI 承载业务逻辑与真实 OpenAI 图片/对话接入，前端 Next.js App Router 负责交互和 API 调用，数据库使用 PostgreSQL Schema 分区，Redis/RQ 承载任务队列。

## 目录结构

```text
.
├─ backend/
│  ├─ app/
│  │  ├─ core/          # 配置、数据库、Redis、安全、Provider、队列、响应格式
│  │  ├─ models/        # Pydantic 请求/响应模型
│  │  ├─ providers/     # mock provider 与 OpenAI 图片 provider
│  │  ├─ routers/       # 认证、素材、视频、图片、画布、工具箱、社区、对话、积分、管理后台
│  │  ├─ services/      # 认证、积分、素材、生成、画布、社区、工具、对话、管理后台逻辑
│  │  └─ worker/        # RQ Worker 任务入口
│  ├─ migrations/       # 6 schema、18 张表、索引、触发器、种子数据
│  ├─ tests/            # 后端基础单元测试
│  └─ .env.example      # Docker 后端环境变量模板
├─ frontend/
│  ├─ app/              # Next.js 15 App Router 页面和组件
│  └─ package.json      # React 19、Tailwind、Vercel AI SDK、Masonry
├─ docker-compose.yml   # 本地 postgres/redis/api/worker/scheduler/frontend
├─ fly.toml             # Fly.io API 服务部署配置
├─ .env.example         # 根目录通用环境变量参考
└─ prometheus.yml       # 监控采集配置
```

## 环境依赖

- Python 3.11+
- Node.js 20+（当前验证环境 Node 25.5.0）
- PostgreSQL 16
- Redis 7
- FFmpeg 6.x
- Docker / Docker Compose

## 本地启动

```bash
copy backend\.env.example backend\.env
docker compose up --build -d
```

API 文档：`http://localhost:8000/docs`
前端地址：`http://localhost:3000`

Docker Desktop 可用时，可直接执行完整容器健康检查：

```powershell
powershell.exe -ExecutionPolicy Bypass -File scripts/check-docker.ps1
```

如果需要本地非 Docker 前端开发：

```bash
cd frontend
npm install
npm run dev
```

## 验证命令

```bash
powershell.exe -ExecutionPolicy Bypass -File scripts/check-local.ps1
powershell.exe -ExecutionPolicy Bypass -File scripts/check-docker.ps1
```

或手动分步执行：

```bash
cd backend
ruff check app/ tests/
pytest -q -p no:cacheprovider --basetemp .pytest-basetemp

cd frontend
npm install
npm.cmd run build
npm.cmd run check:standalone
npm.cmd run check:routes
```

当前已验证：

- 后端 `ruff check app/ tests/` 通过
- 后端 `pytest -q -p no:cacheprovider --basetemp .pytest-basetemp` 通过，83/83
- FastAPI OpenAPI 生成 88 个操作，覆盖 PRD 的 74 个接口目标线
- 前端 `npm.cmd run build` 通过，Next.js 15.5.19 生成 20 个 App Router 页面
- 前端生产 standalone `npm.cmd run check:standalone` 通过，会自动启动服务并覆盖 13 个关键页面
- 根目录 `powershell.exe -ExecutionPolicy Bypass -File scripts/check-local.ps1` 可串联 compose 静态校验、后端 lint/test、前端 build 和 standalone 路由验收
- Docker Desktop 可用时，根目录 `powershell.exe -ExecutionPolicy Bypass -File scripts/check-docker.ps1` 可执行 `docker compose up --build -d`、等待 6 服务 healthy，并验证 API `/health` 与前端 13 个关键路由
- `docker compose config` 通过，可解析 postgres/redis/api/worker/scheduler/frontend 六服务配置
- Compose 已为 6 个服务配置 healthcheck，frontend 等 api healthy 后启动

## 部署步骤

1. 编辑 `backend/.env`，补齐 PostgreSQL、Redis、JWT、Stripe、R2 和 `OPENAI_API_KEY`。
2. 编辑 `frontend/.env.local`，确认 `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`。
3. 本地执行 `docker compose up --build -d` 启动 PostgreSQL、Redis、API、Worker、Scheduler、Frontend。
4. 浏览器登录后可在对话页或图片页填写 `OpenAI API Key`，前端会通过 `X-OpenAI-API-Key` 传给后端用于 GPT 对话和 DALL-E 图片生成。
5. 生产环境使用 `.github/workflows/cd.yml` 手动触发 Fly.io canary 部署，需配置 `FLY_API_TOKEN`、生产数据库、Redis 和对象存储环境变量。
6. 部署后检查 `/health`、`/metrics`、`/docs`，再验证前端 `NEXT_PUBLIC_API_BASE_URL` 指向生产 API。

## 当前实现边界

当前范围内 mock 视频、真实 OpenAI DALL-E 图片、真实 OpenAI SSE 对话、真实 PNG 画布导出、工具箱骨架、社区、积分、充值订单、Stripe Webhook 签名校验与幂等到账、认证/API Key、`X-API-Key` 机器调用鉴权、邮箱验证 token、密码重置 token、登录态改密码、管理后台与 moderator 审核权限、安全响应格式、数据库迁移和 Docker 部署骨架已落地。Google/Seedance/Kling/Runway/Flux/SDXL/Ideogram 仍保留 Provider 骨架，未配置密钥时显示未配置或即将上线。

视频和图片任务同时提供两条执行路径：`run-now` 用于本地立即执行验收，`enqueue` 用于 RQ Worker 异步执行。前端视频/图片工作台可在“立即生成”和“异步队列”之间切换。

## JoyAI-Echo 本地视频 Provider

已下载并学习 `jd-opensource/JoyAI-Echo`，源码保留在 `京东/JoyAI-Echo-main` 作为本机参考目录，未纳入 Git。该仓库是推理型长视频生成项目，参考环境为 Python 3.11、PyTorch 2.8、CUDA 12.8、FFmpeg，默认需要约 46-50GB 显存，并额外下载约 46GB 的 `echo-longvideo-release.safetensors` 和约 24GB 的 `gemma-3-12b`。其许可证偏研究/非商业用途，生产带货场景使用前需要单独确认授权。

后端已接入可选模型 `joyai-echo-longvideo`。默认未配置时只在 `/api/v1/videos/models` 中显示 `coming_soon`，不会影响 mock、Gemini Veo、Nexaxis 等现有路径。高显存机器准备好 JoyAI-Echo 后，在 `backend/.env` 中配置：

```bash
JOYAI_ECHO_REPO_PATH=D:/codex抖音tk带货开发/codex/京东/JoyAI-Echo-main
JOYAI_ECHO_PYTHON=D:/codex抖音tk带货开发/codex/京东/JoyAI-Echo-main/.venv/Scripts/python.exe
JOYAI_ECHO_CHECKPOINT=D:/models/JoyAI-Echo/echo-longvideo-release.safetensors
JOYAI_ECHO_GEMMA_PATH=D:/models/JoyAI-Echo/gemma-3-12b
JOYAI_ECHO_TIMEOUT_SECONDS=7200
```

JoyAI-Echo 环境初始化示例：

```powershell
cd D:\codex抖音tk带货开发\codex\京东\JoyAI-Echo-main
uv venv --python 3.11 .venv
.\.venv\Scripts\python.exe -m pip install --extra-index-url https://download.pytorch.org/whl/cu128 -r requirements.txt
ffmpeg -version
```

配置完成后，视频工作台选择 `JoyAI-Echo LongVideo` 即可通过后端 Provider 创建临时 prompt/config，调用 JoyAI-Echo 的 `inference.py`，并把 `combined_shots.mp4` 复制到本项目 `storage/generated` 下返回。

Docker Desktop Linux Engine 或 WSL 不稳定时，`docker compose up --build -d` 可能无法拉起容器；这属于本机 Docker 运行状态，不影响 Compose 文件静态校验。启动 Docker Desktop 并确认 `docker info` 正常后，再执行该命令完成完整本地栈验证。

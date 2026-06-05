# AI带货视频工厂 V2.0

依据 `终极PRD_完整版.md` 与 `Codex开发指令.md` 落地的全栈工程骨架。项目采用前后端分层：后端 FastAPI 承载全部业务逻辑，前端 Next.js App Router 只负责交互和 API 调用，数据库使用 PostgreSQL Schema 分区，Redis/RQ 承载任务队列。

## 目录结构

```text
.
├─ backend/
│  ├─ app/
│  │  ├─ core/          # 配置、数据库、Redis、安全、Provider、队列、响应格式
│  │  ├─ models/        # Pydantic 请求/响应模型
│  │  ├─ providers/     # mock provider 与真实 provider 骨架
│  │  ├─ routers/       # 认证、素材、视频、图片、画布、工具箱、社区、对话、积分、管理后台
│  │  ├─ services/      # 认证、积分、素材、生成、画布、社区、工具、对话、管理后台逻辑
│  │  └─ worker/        # RQ Worker 任务入口
│  ├─ migrations/       # 6 schema、18 张表、索引、触发器、种子数据
│  └─ tests/            # 后端基础单元测试
├─ frontend/
│  ├─ app/              # Next.js 15 App Router 页面和组件
│  └─ package.json      # React 19、Tailwind、Vercel AI SDK、Masonry
├─ docker-compose.yml   # 本地 api/worker/scheduler/postgres/redis
├─ fly.toml             # Fly.io API 服务部署配置
├─ .env.example         # 后端环境变量模板
└─ prometheus.yml       # 监控采集配置
```

## 环境依赖

- Python 3.11+
- Node.js 20+（当前验证环境 Node 25.5.0）
- PostgreSQL 15
- Redis 7
- FFmpeg 6.x
- Docker / Docker Compose

## 本地启动

```bash
cp .env.example .env
docker compose up -d --build
```

API 文档：`http://localhost:8000/docs`

前端开发：

```bash
cd frontend
npm install
npm run dev
```

前端地址：`http://localhost:3000`

## 验证命令

```bash
pip install -e "backend[dev]"
ruff check backend
pytest backend/tests

cd frontend
npm install
npm run build
```

当前已验证：

- 后端 `ruff check backend` 通过
- 后端 `pytest backend/tests` 通过，54/54
- 后端 `python -m compileall backend/app` 通过
- FastAPI OpenAPI 生成 88 个操作，覆盖 PRD 的 74 个接口目标线
- 前端 `npm run build` 通过，Next.js 15.5.19 生成 19 个 App Router 页面
- `docker compose config` 通过，可解析 api/worker/scheduler/postgres/redis 五服务配置
- 当前前端生产服务验证：`http://localhost:3001/chat` 返回 200

## 部署步骤

1. 复制 `.env.example` 为 `.env`，补齐 PostgreSQL、Redis、JWT、Stripe、R2 和 Provider API Key。
2. 本地执行 `docker compose up -d --build` 启动 API、Worker、Scheduler、PostgreSQL、Redis。
3. 生产环境使用 `.github/workflows/cd.yml` 手动触发 Fly.io canary 部署，需配置 `FLY_API_TOKEN`、生产数据库、Redis 和对象存储环境变量。
4. 部署后检查 `/health`、`/metrics`、`/docs`，再验证前端 `NEXT_PUBLIC_API_BASE_URL` 指向生产 API。

## 当前实现边界

V1.0 范围内 mock 视频、mock 图片、基础画布、工具箱骨架、社区骨架、AI 对话 mock 流式输出、积分预估、充值订单、Stripe Webhook 签名校验与幂等到账、认证/API Key、`X-API-Key` 机器调用鉴权、邮箱验证 token、密码重置 token、登录态改密码、管理后台与 moderator 审核权限、安全响应格式、数据库迁移和部署骨架已落地。Google/Seedance/Kling/Runway/Flux/SDXL/DALL-E/Ideogram 的真实调用按 PRD 保留 Provider 骨架，未配置密钥时返回 E200，V1.1 能在对应 Provider 文件内继续接入真实 API。

视频和图片任务同时提供两条执行路径：`run-now` 用于本地同步 mock 验收，`enqueue` 用于 RQ Worker 异步执行。前端视频/图片工作台可在“同步Mock”和“异步队列”之间切换。

Docker Desktop Linux Engine 未运行时，`docker compose up -d --build` 无法拉起容器；这属于本机 Docker 运行状态，不影响 Compose 文件静态校验。启动 Docker Desktop 后再次执行该命令即可完成完整本地栈验证。

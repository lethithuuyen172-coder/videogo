"""OpenAPI 和数据库迁移契约测试。"""

import json
import re
from pathlib import Path

from app.main import app

ROOT = Path(__file__).resolve().parents[2]


def test_openapi_exposes_prd_api_surface() -> None:
    """PRD 要求 74 个 API，当前 OpenAPI 操作数不得低于该目标。"""
    schema = app.openapi()
    operation_count = sum(len(methods) for methods in schema["paths"].values())
    assert operation_count >= 74
    for path in [
        "/api/v1/auth/login",
        "/api/v1/materials",
        "/api/v1/videos",
        "/api/v1/images",
        "/api/v1/canvases",
        "/api/v1/tools",
        "/api/v1/community/works",
        "/api/v1/conversations",
        "/api/v1/credits/balance",
        "/api/v1/admin/dashboard",
    ]:
        assert path in schema["paths"]


def test_migration_defines_required_schemas_and_tables() -> None:
    """001 迁移必须覆盖 PRD 指定的 6 个 schema 和 18 张表。"""
    migration = (ROOT / "backend/migrations/001_create_schema.sql").read_text(encoding="utf-8")
    event_migration = (ROOT / "backend/migrations/004_unified_task_events.sql").read_text(encoding="utf-8")
    for schema in ["public", "video", "image", "canvas", "community", "chat"]:
        if schema == "public":
            assert "public.users" in migration
        else:
            assert f"CREATE SCHEMA IF NOT EXISTS {schema};" in migration

    table_names = set(re.findall(r"CREATE TABLE IF NOT EXISTS ([a-z_]+\.[a-z_]+)", migration))
    assert {
        "public.users",
        "public.api_keys",
        "public.credit_records",
        "public.credit_recharge_orders",
        "public.materials",
        "public.material_references",
        "public.audit_logs",
        "video.video_generation_jobs",
        "video.video_processing_jobs",
        "video.provider_accounts",
        "image.image_generation_jobs",
        "canvas.canvases",
        "canvas.canvas_elements",
        "community.community_works",
        "community.community_likes",
        "community.community_bookmarks",
        "chat.conversations",
        "chat.conversation_messages",
    } <= table_names
    event_table_names = set(re.findall(r"CREATE TABLE IF NOT EXISTS ([a-z_]+\.[a-z_]+)", event_migration))
    assert {"public.task_events", "public.material_usage_events"} <= event_table_names
    for column in [
        "created_at timestamptz NOT NULL DEFAULT now()",
        "updated_at timestamptz NOT NULL DEFAULT now()",
        "deleted_at timestamptz",
    ]:
        assert column in event_migration


def test_seed_data_contains_required_providers() -> None:
    """种子数据必须包含视频和图片 provider。"""
    seed = (ROOT / "backend/migrations/002_seed_data.sql").read_text(encoding="utf-8")
    for provider in [
        "google_gemini",
        "google_vertex",
        "seedance",
        "kling",
        "runway",
        "mock",
        "flux",
        "sdxl",
        "dalle",
        "ideogram",
    ]:
        assert provider in seed


def test_seed_data_covers_demo_acceptance_records() -> None:
    """演示数据必须覆盖资产、画布、社区、积分和管理员登录验收。"""
    seed = (ROOT / "backend/migrations/002_seed_data.sql").read_text(encoding="utf-8")
    for email in ["admin@demo.com", "user1@demo.com", "user2@demo.com"]:
        assert email in seed
    assert "'admin', 'active', 10000" in seed
    assert "'user', 'active', 500" in seed
    assert "FOR idx IN 1..10 LOOP" in seed
    assert "FROM public.materials WHERE user_id = user1_id AND source = 'seed'" in seed
    assert "FOR idx IN 1..3 LOOP" in seed
    assert "FROM canvas.canvases WHERE user_id = user1_id AND title LIKE '演示画布%'" in seed
    assert "FOR idx IN 1..5 LOOP" in seed
    assert "CASE WHEN idx <= 3 THEN 'published' ELSE 'pending_review' END" in seed
    assert "FOR idx IN 1..20 LOOP" in seed
    assert "FROM public.credit_records WHERE user_id = user1_id AND task_id LIKE 'seed-%'" in seed


def test_compose_defines_six_services_with_healthchecks() -> None:
    """本地 Docker Compose 必须覆盖 6 个服务并声明健康检查。"""
    compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    for service in ["postgres", "redis", "api", "worker", "scheduler", "frontend"]:
        assert f"  {service}:" in compose
    assert compose.count("healthcheck:") >= 6
    assert "condition: service_healthy" in compose
    assert "await conn.fetchval" in compose
    assert "SELECT 1" in compose
    assert "await conn.close()" in compose


def test_frontend_docker_build_gets_public_api_base_url() -> None:
    """NEXT_PUBLIC_API_BASE_URL 必须在 Next build 阶段注入客户端 bundle。"""
    compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    dockerfile = (ROOT / "frontend/Dockerfile").read_text(encoding="utf-8")
    dockerignore = (ROOT / "frontend/.dockerignore").read_text(encoding="utf-8")
    assert "args:" in compose
    assert "NEXT_PUBLIC_API_BASE_URL: http://localhost:8000/api/v1" in compose
    assert "ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1" in dockerfile
    assert "ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL" in dockerfile
    for required_path in ["package.json", "package-lock.json", "app/", "public/", "next.config.ts"]:
        assert required_path not in dockerignore


def test_frontend_api_calls_go_through_api_client() -> None:
    """前端页面的 API 调用必须走 apiClient，裸 fetch 只允许封装层使用。"""
    app_dir = ROOT / "frontend/app"
    api_file = app_dir / "lib/api.ts"
    for path in app_dir.rglob("*.tsx"):
        text = path.read_text(encoding="utf-8")
        assert "fetch(" not in text, f"裸 fetch 不应出现在 {path}"
        if "apiClient." in text:
            assert 'from "@/lib/api"' in text, f"{path} 应从 @/lib/api 导入 apiClient"
    api_text = api_file.read_text(encoding="utf-8")
    assert "fetch(" in api_text
    assert "streamPost" in api_text
    assert "async function readJson" in api_text
    assert "if (!res.ok)" in api_text
    assert 'new ApiError("STREAM_ERROR"' in api_text
    assert "getSessionOpenAIKey()" in api_text
    assert 'headers.set("X-OpenAI-API-Key", openaiApiKey)' in api_text


def test_frontend_required_pages_exist_and_are_api_driven() -> None:
    """验收要求的主要页面必须存在，并使用 API 数据驱动。"""
    required_pages = [
        "chat/page.tsx",
        "video/page.tsx",
        "image/page.tsx",
        "assets/page.tsx",
        "discover/page.tsx",
        "discover/[workId]/page.tsx",
        "credits/page.tsx",
        "credits/recharge/page.tsx",
        "admin/page.tsx",
        "canvas/page.tsx",
        "canvas/[canvasId]/page.tsx",
        "tools/page.tsx",
        "auth/login/page.tsx",
        "auth/register/page.tsx",
        "auth/forgot-password/page.tsx",
        "auth/reset-password/page.tsx",
    ]
    for relative_path in required_pages:
        path = ROOT / "frontend/app" / relative_path
        assert path.exists()
        text = path.read_text(encoding="utf-8")
        route_dir = path.parent
        route_sources = "\n".join(
            item.read_text(encoding="utf-8")
            for item in route_dir.rglob("*")
            if item.suffix in {".ts", ".tsx"}
        )
        assert "apiClient." in route_sources or relative_path.startswith("auth/")
        assert "Array.from" not in text


def test_homepage_dispatches_modes_and_da_style_skills() -> None:
    """首页中央输入框必须分发到 Agent/视频/图片和 DA-style 四技能入口。"""
    home = (ROOT / "frontend/app/page.tsx").read_text(encoding="utf-8")
    tool_detail = (ROOT / "frontend/app/tools/[toolKey]/page.tsx").read_text(encoding="utf-8")
    for snippet in [
        'key: "agent", label: "Agent", href: "/chat"',
        'key: "video", label: "AI 视频", href: "/video"',
        'key: "image", label: "AI 图片", href: "/image"',
        "选择技能",
        'href: "/tools/video-quality-enhance"',
        'href: "/tools/video-watermark-remove"',
        'href: "/tools/video-subtitle-erase"',
        'href: "/tools/hot-video-remix"',
        "sessionStorage.setItem",
        "normalizedPrompt.slice(0, 2000)",
        "先输入一个创作需求",
        "router.push(`${activeMode.href}?${query}`)",
    ]:
        assert snippet in home
    for snippet in [
        '"video-quality-enhance": "enhance"',
        '"video-watermark-remove": "watermark-remove"',
        '"video-subtitle-erase": "subtitle-erase"',
        '"hot-video-remix": "viral-remix"',
        "context_id",
        "sessionStorage.getItem",
        "searchParams.get(\"prompt\")",
        "searchParams.get(\"reference\")",
        "searchParams.get(\"subject\")",
    ]:
        assert snippet in tool_detail


def test_frontend_global_shell_and_error_pages_cover_mobile_acceptance() -> None:
    """全局壳必须覆盖侧边栏登录态、移动底部导航、404 和错误页。"""
    shell = (ROOT / "frontend/app/components/AppShell.tsx").read_text(encoding="utf-8")
    for snippet in [
        "md:hidden",
        "pb-20",
        "MessageCircle",
        "Video",
        "Compass",
        "User",
        "user.email",
        "logout",
        'href="/auth/login"',
    ]:
        assert snippet in shell
    for href in ['href: "/chat"', 'href: "/video"', 'href: "/discover"', 'href: "/credits"']:
        assert href in shell

    not_found = (ROOT / "frontend/app/not-found.tsx").read_text(encoding="utf-8")
    error_page = (ROOT / "frontend/app/error.tsx").read_text(encoding="utf-8")
    assert "404" in not_found
    assert "页面不存在" in not_found
    assert 'href="/"' in not_found
    assert '"use client"' in error_page
    assert "error.message" in error_page
    assert "reset" in error_page


def test_frontend_tooling_matches_runtime_and_design_contracts() -> None:
    """前端工具链必须支持 standalone Docker、Tailwind token 和 lucide 图标。"""
    package_json = json.loads((ROOT / "frontend/package.json").read_text(encoding="utf-8"))
    next_config = (ROOT / "frontend/next.config.ts").read_text(encoding="utf-8")
    tailwind = (ROOT / "frontend/tailwind.config.ts").read_text(encoding="utf-8")
    assert package_json["scripts"]["build"] == "node --max-old-space-size=4096 node_modules/next/dist/bin/next build"
    assert package_json["scripts"]["start"] == "node .next/standalone/server.js"
    assert package_json["scripts"]["check:standalone"] == "node scripts/check-standalone.mjs"
    assert package_json["scripts"]["check:routes"] == "node scripts/check-standalone-routes.mjs"
    assert "lucide-react" in package_json["dependencies"]
    assert 'output: "standalone"' in next_config
    for token in [
        'ink: "#111827"',
        'panel: "#f8fafc"',
        'line: "#d7dde8"',
        'accent: "#0f766e"',
        'signal: "#b45309"',
    ]:
        assert token in tailwind


def test_frontend_standalone_route_check_covers_acceptance_pages() -> None:
    """生产 standalone 路由检查必须覆盖主要验收页面。"""
    standalone_check = (ROOT / "frontend/scripts/check-standalone.mjs").read_text(encoding="utf-8")
    route_check = (ROOT / "frontend/scripts/check-standalone-routes.mjs").read_text(encoding="utf-8")
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    for route in [
        '"/chat"',
        '"/image"',
        '"/video"',
        '"/assets"',
        '"/discover"',
        '"/credits"',
        '"/credits/recharge"',
        '"/admin"',
        '"/auth/login"',
        '"/auth/register"',
        '"/canvas"',
        '"/tools"',
    ]:
        assert route in route_check
    assert 'process.env.FRONTEND_BASE_URL ?? "http://localhost:3000"' in route_check
    assert "response.ok" in route_check
    assert 'spawn(process.execPath, [".next/standalone/server.js"]' in standalone_check
    assert "await import(\"./check-standalone-routes.mjs\")" in standalone_check
    assert "server.kill()" in standalone_check
    assert "npm.cmd run check:standalone" in readme
    assert "npm.cmd run check:routes" in readme
    assert "X-OpenAI-API-Key" in readme


def test_root_local_check_script_runs_all_offline_acceptance_gates() -> None:
    """根目录验收脚本必须串联当前可离线验证的关键命令。"""
    script = (ROOT / "scripts/check-local.ps1").read_text(encoding="utf-8")
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    for snippet in [
        "function Invoke-Native",
        'throw "$FilePath exited with code $LASTEXITCODE"',
        'Invoke-Native -FilePath docker -Arguments @("compose", "config", "--services")',
        'Invoke-Native -FilePath ruff -Arguments @("check", "app/", "tests/")',
        'Invoke-Native -FilePath pytest -Arguments @("-q", "-p", "no:cacheprovider", "--basetemp", ".pytest-basetemp")',
        'Invoke-Native -FilePath npm.cmd -Arguments @("run", "build")',
        'Invoke-Native -FilePath npm.cmd -Arguments @("run", "check:standalone")',
        "Remove-Item -LiteralPath $basetemp.Path -Recurse -Force",
    ]:
        assert snippet in script
    assert "powershell.exe -ExecutionPolicy Bypass -File scripts/check-local.ps1" in readme


def test_root_docker_check_script_runs_compose_health_and_frontend_routes() -> None:
    """Docker 可用时的完整验收脚本必须覆盖 compose up、健康检查和前端路由。"""
    script = (ROOT / "scripts/check-docker.ps1").read_text(encoding="utf-8")
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    for snippet in [
        "function Invoke-Native",
        'throw "$FilePath exited with code $LASTEXITCODE"',
        'Invoke-Native -FilePath docker -Arguments @("info")',
        'Invoke-Native -FilePath docker -Arguments @("compose", "up", "--build", "-d")',
        "[Parameter(ValueFromRemainingArguments = $true)]",
        'Invoke-Native -FilePath docker -Arguments @(@("compose") + $ComposeArgs)',
        "Invoke-Compose ps -q $Service",
        '@("postgres", "redis", "api", "worker", "scheduler", "frontend")',
        'Invoke-Native -FilePath docker -Arguments @("inspect", "--format"',
        "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}",
        'Invoke-WebRequest -Uri "http://localhost:8000/health"',
        'Contains(\'"healthy"\')',
        'http://localhost:3000$route',
        'Invoke-WebRequest -Uri $url',
        "if ($response.StatusCode -ne 200)",
        "Invoke-Compose down",
    ]:
        assert snippet in script
    for route in [
        '"/chat"',
        '"/image"',
        '"/video"',
        '"/assets"',
        '"/discover"',
        '"/credits"',
        '"/admin"',
        '"/canvas"',
    ]:
        assert route in script
    assert "powershell.exe -ExecutionPolicy Bypass -File scripts/check-docker.ps1" in readme
    assert "API `/health`" in readme


def test_frontend_auth_pages_cover_required_interactions() -> None:
    """认证页必须覆盖登录、注册、忘记密码和重置密码的明确交互要求。"""
    auth_dir = ROOT / "frontend/app/auth"
    login = (auth_dir / "login/page.tsx").read_text(encoding="utf-8")
    register = (auth_dir / "register/page.tsx").read_text(encoding="utf-8")
    forgot = (auth_dir / "forgot-password/page.tsx").read_text(encoding="utf-8")
    reset = (auth_dir / "reset-password/page.tsx").read_text(encoding="utf-8")

    assert "Eye, EyeOff" in login
    assert 'href="/auth/register"' in login
    assert 'router.push("/chat")' in login
    assert "登录失败" in login

    assert "Eye, EyeOff" in register
    assert 'href="/auth/login"' in register
    assert "至少8位含大小写字母和数字" in register
    assert "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" in register
    assert "去登录" in register

    assert "/auth/forgot-password" in forgot
    assert "重置链接已发送" in forgot
    assert "开发环境 token" in forgot
    assert 'href="/auth/login"' in forgot

    assert "/auth/reset-password" in reset
    assert "new_password" in reset
    assert "两次密码不一致" in reset
    assert 'router.push("/auth/login")' in reset


def test_frontend_openai_key_can_be_filled_in_browser() -> None:
    """对话和图片页必须提供浏览器内填写 OpenAI Key 的入口。"""
    key_box = (ROOT / "frontend/app/components/OpenAIKeyBox.tsx").read_text(encoding="utf-8")
    chat = (ROOT / "frontend/app/chat/page.tsx").read_text(encoding="utf-8")
    image = (ROOT / "frontend/app/image/page.tsx").read_text(encoding="utf-8")
    image_settings = (ROOT / "frontend/app/image/components/ImageSettingsPanel.tsx").read_text(encoding="utf-8")
    for snippet in [
        "setSessionOpenAIKey(trimmed)",
        "clearSessionOpenAIKey()",
        "OpenAI API Key",
        'placeholder="sk-..."',
        "已在当前会话生效",
    ]:
        assert snippet in key_box
    session_key = (ROOT / "frontend/app/lib/sessionOpenAIKey.ts").read_text(encoding="utf-8")
    assert 'window.dispatchEvent(new Event("openai-api-key-updated"))' in session_key
    assert "localStorage" not in session_key
    assert "OpenAIKeyBox" in chat
    assert "OpenAIKeyBox" in image
    assert 'const effectiveRunMode = modelId === "dalle-3" ? "sync" : runMode' in image
    assert 'disabled={modelId === "dalle-3" && item.value === "queue"}' in image
    assert "DALL-E 使用浏览器填写的 OpenAI Key 时会立即生成" in image
    assert "effectiveRunMode)" in image
    assert 'item.model_id === "dalle-3" && item.status === "configured"' in image_settings
    assert "setModelId((preferred ?? items[0]).model_id)" in image_settings
    assert 'window.addEventListener("openai-api-key-updated", loadModels)' in image_settings
    assert 'window.removeEventListener("openai-api-key-updated", loadModels)' in image_settings


def test_frontend_image_queue_mode_polls_job_until_terminal_state() -> None:
    """图片异步队列模式必须轮询任务详情，直到页面能展示最终产物。"""
    hook = (ROOT / "frontend/app/image/hooks/useImageGeneration.ts").read_text(encoding="utf-8")
    assert "setJob(await pollImageJob(created.id))" in hook
    assert "async function pollImageJob(jobId: string): Promise<ImageJob>" in hook
    assert 'apiClient.get<ImageJob>(`/images/${jobId}`)' in hook
    for status in ['"succeeded"', '"failed"', '"cancelled"']:
        assert status in hook
    assert "window.setTimeout(resolve, 1500)" in hook


def test_frontend_video_queue_mode_polls_job_until_terminal_state() -> None:
    """视频异步队列模式必须轮询任务详情，直到页面能展示最终产物。"""
    hook = (ROOT / "frontend/app/video/hooks/useVideoGeneration.ts").read_text(encoding="utf-8")
    assert "setJob(await pollVideoJob(created.id))" in hook
    assert "async function pollVideoJob(jobId: string): Promise<VideoJob>" in hook
    assert 'apiClient.get<VideoJob>(`/videos/${jobId}`)' in hook
    for status in ['"succeeded"', '"failed"', '"cancelled"']:
        assert status in hook
    assert "window.setTimeout(resolve, 1500)" in hook


def test_frontend_canvas_editor_covers_required_interactions() -> None:
    """画布编辑器必须覆盖拖拽、图层、组件添加、缩放和导出。"""
    canvas_dir = ROOT / "frontend/app/canvas"
    editor = (canvas_dir / "[canvasId]/page.tsx").read_text(encoding="utf-8")
    workspace = (canvas_dir / "components/CanvasWorkspace.tsx").read_text(encoding="utf-8")
    layer = (canvas_dir / "components/LayerPanel.tsx").read_text(encoding="utf-8")
    component = (canvas_dir / "components/ComponentPanel.tsx").read_text(encoding="utf-8")
    toolbar = (canvas_dir / "components/CanvasToolbar.tsx").read_text(encoding="utf-8")

    for snippet in [
        "apiClient.get<CanvasData>",
        "apiClient.put<CanvasElement>",
        "apiClient.post<CanvasElement>",
        'content: "双击编辑"',
        'width: element_type === "circle" ? 150 : 200',
        'height: element_type === "circle" ? 150 : 150',
        '"#2563eb"',
        '"#dc2626"',
        "undo",
        "redo",
    ]:
        assert snippet in editor
    for snippet in [
        'window.addEventListener("mousemove", move)',
        'window.addEventListener("mouseup", up)',
        "border-dashed border-blue-500",
        "updateElement(next, false)",
        'transform: `scale(${scale})`',
        '"#2563eb"',
        '"#dc2626"',
    ]:
        assert snippet in workspace
    for snippet in ["Eye", "EyeOff", "Lock", "Unlock", "ArrowUp", "ArrowDown", "z_index + 1", "Math.max(0"]:
        assert snippet in layer
    for label in ["添加文字", "添加矩形", "添加圆形", "添加图片"]:
        assert label in component
    for snippet in ['min={50}', 'max={200}', "apiClient.post<{ url: string }>", "/export", "Download", "Undo2", "Redo2"]:
        assert snippet in toolbar


def test_frontend_business_pages_cover_required_api_workflows() -> None:
    """资产、发现、积分和管理后台必须覆盖真实 API 交互验收。"""
    app_dir = ROOT / "frontend/app"
    assets = (app_dir / "assets/page.tsx").read_text(encoding="utf-8")
    discover = (app_dir / "discover/page.tsx").read_text(encoding="utf-8")
    discover_detail = (app_dir / "discover/[workId]/page.tsx").read_text(encoding="utf-8")
    credits = (app_dir / "credits/page.tsx").read_text(encoding="utf-8")
    recharge = (app_dir / "credits/recharge/page.tsx").read_text(encoding="utf-8")
    admin = (app_dir / "admin/page.tsx").read_text(encoding="utf-8")

    for snippet in [
        "apiClient",
        'get<Material[]>(`/materials${query}`)',
        'apiClient.delete(`/materials/${material.id}`)',
        'confirm(`确认删除 ${material.title}？`)',
        "setPreview(item)",
        "Grid2X2",
        "Upload",
    ]:
        assert snippet in assets
    for material_type in ['value: "image"', 'value: "video"', 'value: "audio"', 'value: "text"']:
        assert material_type in assets

    for snippet in [
        'apiClient.get<Work[]>(`/community/works${query}`)',
        "Masonry",
        "暂无作品，去创作第一个吧",
        'href="/image"',
    ]:
        assert snippet in discover
    assert "Array.from" not in discover
    for snippet in [
        'apiClient.get<Work>(`/community/works/${params.workId}`)',
        'apiClient.post(`/community/works/${work.id}/like`)',
        'apiClient.delete(`/community/works/${work.id}/like`)',
        'apiClient.post(`/community/works/${work.id}/bookmark`)',
        'apiClient.delete(`/community/works/${work.id}/bookmark`)',
        "点赞操作失败",
        "收藏操作失败",
    ]:
        assert snippet in discover_detail

    for snippet in [
        'apiClient.get<Balance>("/credits/balance")',
        'apiClient.get<CreditRecord[]>("/credits/records")',
        "deduct",
        "recharge",
        "refund",
        "freeze",
        "adjust",
        "积分不足，去充值",
        "text-green-600",
        "text-red-600",
    ]:
        assert snippet in credits
    for snippet in [
        'apiClient.post<RechargeOrder>("/credits/recharge-orders", { credits })',
        "out_trade_no",
        "开发模式支付链接",
        "checkout_url",
        "前往支付",
    ]:
        assert snippet in recharge

    for snippet in [
        'apiClient.get<DashboardStats>("/admin/dashboard")',
        'apiClient.get<AdminUser[]>("/admin/users")',
        'apiClient.get<ModerationWork[]>("/admin/moderation/works")',
        'apiClient.get<ProviderAccount[]>("/admin/provider-accounts")',
        'apiClient.put(`/admin/users/${user.id}`, { status: "suspended" })',
        'apiClient.post(`/admin/moderation/works/${work.id}`, { status })',
        "需要管理员权限",
        "Provider账号池",
    ]:
        assert snippet in admin

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Brush,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { apiClient } from "@/lib/api";

type Job = {
  id: string;
  model_id: string;
  provider_key: string;
  status: string;
  progress: number;
  credit_cost: number;
  output_url?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
};

type TaskItem = Job & {
  kind: "video" | "image" | "tool";
  tool_key?: string;
};

type ToolJob = {
  id: string;
  tool_key: string;
  status: string;
  progress: number;
  credit_cost: number;
  output_url?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
};

const filters: Array<{ label: string; value: "all" | "running" | "done" | "failed" }> = [
  { label: "全部", value: "all" },
  { label: "进行中", value: "running" },
  { label: "已完成", value: "done" },
  { label: "失败", value: "failed" },
];

const runningStatuses = ["pending", "queued", "processing", "running"];
const doneStatuses = ["succeeded", "completed", "done"];
const failedStatuses = ["failed", "cancelled", "canceled"];

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const [videos, images, tools] = await Promise.all([
        apiClient.get<Job[]>("/videos"),
        apiClient.get<Job[]>("/images"),
        apiClient.get<ToolJob[]>("/tools/tasks"),
      ]);
      const merged = [
        ...videos.map((item) => ({ ...item, kind: "video" as const })),
        ...images.map((item) => ({ ...item, kind: "image" as const })),
        ...tools.map((item) => ({
          ...item,
          kind: "tool" as const,
          model_id: item.tool_key,
          provider_key: "toolbox",
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTasks(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "任务加载失败");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const stats = useMemo(() => {
    const running = tasks.filter((item) => runningStatuses.includes(item.status)).length;
    const done = tasks.filter((item) => doneStatuses.includes(item.status)).length;
    const failed = tasks.filter((item) => failedStatuses.includes(item.status)).length;
    const credits = tasks.reduce((sum, item) => sum + (item.credit_cost ?? 0), 0);
    return { running, done, failed, credits };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (filter === "running") return tasks.filter((item) => runningStatuses.includes(item.status));
    if (filter === "done") return tasks.filter((item) => doneStatuses.includes(item.status));
    if (filter === "failed") return tasks.filter((item) => failedStatuses.includes(item.status));
    return tasks;
  }, [filter, tasks]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">Task Center</p>
            <h1 className="mt-2 text-4xl font-semibold md:text-5xl">任务中心</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">
              汇总 AI 视频、AI 图片和工具箱处理任务的排队、生成、完成和失败记录，把 DA 类生成站的异步任务流集中管理。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white" href="/video">
              <FileVideo size={16} />
              新建视频
            </Link>
            <Link className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-[#0071e3]" href="/image">
              <ImageIcon size={16} />
              新建图片
            </Link>
            <Link className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-[#0071e3]" href="/tools">
              <WandSparkles size={16} />
              新建工具
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric icon={Loader2} label="进行中" value={`${stats.running}`} tone="blue" />
        <Metric icon={CheckCircle2} label="已完成" value={`${stats.done}`} tone="green" />
        <Metric icon={AlertCircle} label="失败/取消" value={`${stats.failed}`} tone="red" />
        <Metric icon={Sparkles} label="累计积分" value={`${stats.credits}`} tone="dark" />
      </section>

      <section className="mt-5 rounded-lg border border-black/10 bg-white/85 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.value}
                className={`h-9 rounded-full border px-4 text-sm font-semibold ${
                  filter === item.value ? "border-[#1d1d1f] bg-[#1d1d1f] text-white" : "border-black/10 bg-[#f5f5f7] text-[#424245]"
                }`}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button className="inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-[#0071e3]" onClick={loadTasks} disabled={isLoading}>
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
            刷新
          </button>
        </div>

        {error ? (
          <div className="m-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="grid min-h-72 place-items-center text-sm text-[#86868b]">
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-[#0071e3]" />
              同步任务列表
            </span>
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="grid min-h-72 place-items-center p-6 text-center">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f5f5f7] text-[#0071e3]">
                <Plus size={20} />
              </div>
              <p className="mt-4 text-sm font-semibold">还没有任务</p>
              <p className="mt-2 text-sm text-[#86868b]">从视频、图片或工具工作台创建一个任务后，会在这里看到队列状态。</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-black/10">
            {visibleTasks.map((task) => (
              <TaskRow key={`${task.kind}-${task.id}`} task={task} onTaskSaved={loadTasks} routerPush={router.push} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Loader2; label: string; value: string; tone: "blue" | "green" | "red" | "dark" }) {
  const tones = {
    blue: "text-[#0071e3] bg-[#f2f8ff]",
    green: "text-[#248a3d] bg-[#e7f8ee]",
    red: "text-[#d70015] bg-[#fff1f2]",
    dark: "text-[#1d1d1f] bg-white",
  };
  return (
    <div className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
      <div className={`grid h-10 w-10 place-items-center rounded-full ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="mt-4 text-sm font-semibold text-[#6e6e73]">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function TaskRow({
  task,
  onTaskSaved,
  routerPush,
}: {
  task: TaskItem;
  onTaskSaved: () => void;
  routerPush: (href: string) => void;
}) {
  const Icon = task.kind === "video" ? FileVideo : task.kind === "image" ? ImageIcon : WandSparkles;
  const href = task.kind === "video" ? "/video" : task.kind === "image" ? "/image" : "/tools";
  const [notice, setNotice] = useState("");
  const [isSaving, setSaving] = useState(false);
  const statusTone = doneStatuses.includes(task.status)
    ? "bg-[#e7f8ee] text-[#248a3d]"
    : failedStatuses.includes(task.status)
      ? "bg-[#fff1f2] text-[#d70015]"
      : "bg-[#f2f8ff] text-[#0071e3]";
  const publishType = task.kind === "image" ? "image" : "video";
  const publishHref = `/works?type=${publishType}&title=${encodeURIComponent(task.kind === "tool" ? `工具结果 ${task.model_id}` : task.kind === "image" ? "AI 图片生成结果" : "AI 视频生成结果")}&cover=${encodeURIComponent(task.output_url ?? "")}&description=${encodeURIComponent(`${task.model_id} · ${task.status} · ${task.credit_cost} credits`)}`;
  const outputType = task.kind === "image" ? "image" : "video";
  const outputTitle = task.kind === "tool" ? `工具结果 ${task.model_id}` : task.kind === "image" ? "AI 图片生成结果" : "AI 视频生成结果";

  const buildReuseUrl = (targetHref: string) => {
    const params = new URLSearchParams();
    params.set("reference", task.output_url ?? "");
    params.set("subject", outputTitle);
    params.set("prompt", `${outputTitle} 复用：${task.model_id}`);
    return `${targetHref}?${params.toString()}`;
  };

  const copyOutputUrl = async () => {
    if (!task.output_url) return;
    await navigator.clipboard.writeText(task.output_url);
    setNotice("已复制输出 URL");
  };

  const downloadOutput = () => {
    if (!task.output_url) return;
    const anchor = document.createElement("a");
    anchor.href = task.output_url;
    anchor.download = outputTitle;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setNotice("已开始下载");
  };

  const saveToAssets = async () => {
    if (!task.output_url) return;
    setSaving(true);
    setNotice("");
    try {
      await apiClient.post("/materials/from-url", {
        url: task.output_url,
        title: outputTitle,
        material_type: outputType,
        tags: ["task-output", task.kind, task.model_id],
        source_task_type: task.kind,
        source_task_id: task.id,
      });
      setNotice("已保存到资产中心");
      onTaskSaved();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "保存到资产失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_180px_160px] lg:items-center">
      <div className="flex min-w-0 gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#f5f5f7] text-[#0071e3]">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{task.kind === "video" ? "AI 视频任务" : task.kind === "image" ? "AI 图片任务" : `工具任务 · ${task.tool_key ?? task.model_id}`}</h2>
            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusTone}`}>{task.status}</span>
          </div>
          <p className="mt-1 truncate text-xs text-[#86868b]">{task.id}</p>
          {task.error_message ? <p className="mt-2 text-xs text-red-600">{task.error_message}</p> : null}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-[#6e6e73]">
          <span>{task.model_id}</span>
          <span>{task.progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8e8ed]">
          <div className="h-full rounded-full bg-[#0071e3]" style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 lg:justify-end">
        <div className="text-right text-xs text-[#86868b]">
          <div className="inline-flex items-center gap-1">
            <Clock3 size={13} />
            {formatDate(task.created_at)}
          </div>
          <div className="mt-1 font-semibold text-[#1d1d1f]">{task.credit_cost} 积分</div>
        </div>
        {task.output_url ? (
          <div className="flex flex-wrap justify-end gap-2">
            <a className="rounded-full bg-[#1d1d1f] px-3 py-2 text-xs font-semibold text-white" href={task.output_url} target="_blank" rel="noreferrer">
              查看
            </a>
            <button className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#0071e3]" onClick={() => void saveToAssets()} disabled={isSaving}>
              <Save size={13} className="inline" />
              {isSaving ? "保存中" : "存资产"}
            </button>
            <button className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#0071e3]" onClick={() => void copyOutputUrl()}>
              <Copy size={13} className="inline" />
              复制
            </button>
            <button className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#0071e3]" onClick={downloadOutput}>
              <Download size={13} className="inline" />
              下载
            </button>
            <button className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#0071e3]" onClick={() => routerPush(buildReuseUrl("/canvas"))}>
              <Brush size={13} className="inline" />
              画布
            </button>
            <button className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#0071e3]" onClick={() => routerPush(buildReuseUrl(task.kind === "image" ? "/image" : "/video"))}>
              {task.kind === "image" ? <ImageIcon size={13} className="inline" /> : <FileVideo size={13} className="inline" />}
              复用
            </button>
            <button className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#0071e3]" onClick={() => routerPush(buildReuseUrl("/tools/video-quality-enhance"))}>
              <WandSparkles size={13} className="inline" />
              增强
            </button>
            <Link className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#0071e3]" href={publishHref}>
              发布
            </Link>
          </div>
        ) : (
          <Link className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#0071e3]" href={href}>
            继续
          </Link>
        )}
        {notice ? <div className="mt-2 text-right text-xs font-semibold text-[#0071e3]">{notice}</div> : null}
      </div>
    </article>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  AtSign,
  Bot,
  BrainCircuit,
  CheckCircle2,
  FileUp,
  Image as ImageIcon,
  Loader2,
  MessageSquareText,
  PenLine,
  Send,
  Sparkles,
  Video,
  WandSparkles,
} from "lucide-react";
import { OpenAIKeyBox } from "@/components/OpenAIKeyBox";
import { apiClient } from "@/lib/api";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; skill_key: string; created_at: string };
type ApiMessage = { id: string; role: "user" | "assistant"; content: string; created_at: string };

const skills = [
  { key: "general", label: "通用 Agent", icon: BrainCircuit, desc: "规划、拆解、生成完整方案" },
  { key: "video", label: "视频脚本", icon: Video, desc: "分镜、口播、镜头和转化点" },
  { key: "image", label: "图片提示词", icon: ImageIcon, desc: "商品图、海报和场景图" },
  { key: "script", label: "带货文案", icon: PenLine, desc: "标题、卖点、钩子和 CTA" },
  { key: "analysis", label: "素材分析", icon: MessageSquareText, desc: "拆解竞品和复刻路径" },
];

const modes = ["自动", "深度思考", "快创作", "投放优化"];

const starterPrompts = [
  "把这个商品卖点改成 30 秒 TikTok 带货视频脚本",
  "参考爆款结构，生成 6 个分镜和每镜头提示词",
  "把图片生成提示词拆成主体、场景、光线、镜头、风格",
  "帮我规划一个长视频带货故事，保持角色和商品一致",
];

export default function ChatPage() {
  const [skill, setSkill] = useState("general");
  const [mode, setMode] = useState("自动");
  const [input, setInput] = useState("");
  const [reference, setReference] = useState("");
  const [subject, setSubject] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "选择技能、添加参考素材或 @主体 后，直接输入你要生成的内容。我会按 Agent 模式拆解为可执行创作方案。" },
  ]);

  const activeSkill = useMemo(() => skills.find((item) => item.key === skill) ?? skills[0], [skill]);

  useEffect(() => {
    apiClient.get<Conversation[]>("/conversations").then((items) => {
      setConversations(items);
      if (items[0]) setConversationId(items[0].id);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    apiClient.get<ApiMessage[]>(`/conversations/${conversationId}/messages`).then((items) => {
      setMessages(items.length ? items.map((item) => ({ role: item.role, content: item.content })) : []);
    }).catch((err) => setError(err instanceof Error ? err.message : "消息加载失败"));
  }, [conversationId]);

  const newConversation = async () => {
    setError(null);
    try {
      const created = await apiClient.post<Conversation>("/conversations", { title: "新创作", skill_key: skill });
      setConversations((items) => [created, ...items]);
      setConversationId(created.id);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "新对话创建失败");
    }
  };

  const buildAgentPrompt = (content: string) => [
    `Agent 模式：${mode}`,
    `技能：${activeSkill.label}`,
    subject.trim() ? `@主体：${subject.trim()}` : null,
    reference.trim() ? `参考素材：${reference.trim()}` : null,
    `任务：${content}`,
  ].filter(Boolean).join("\n");

  const send = async () => {
    const content = input.trim();
    if (!content || isSending) return;
    const finalContent = buildAgentPrompt(content);
    setError(null);
    setSending(true);
    setInput("");
    let activeId = conversationId;
    try {
      if (!activeId) {
        const created = await apiClient.post<Conversation>("/conversations", { title: content.slice(0, 32), skill_key: skill });
        activeId = created.id;
        setConversationId(created.id);
        setConversations((items) => [created, ...items]);
      }
      setMessages((items) => [...items, { role: "user", content: finalContent }, { role: "assistant", content: "" }]);
      const stream = await apiClient.streamPost(`/conversations/${activeId}/stream`, { content: finalContent });
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === "[DONE]") continue;
          const parsed = JSON.parse(payload) as { token: string };
          setMessages((items) => {
            const copy = [...items];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: `${last.content}${parsed.token}` };
            return copy;
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="grid gap-5 rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl xl:grid-cols-[1fr_320px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">AI Agent</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">创作中枢</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">
            对齐 DA 的首页输入体验：参考素材、文字需求、@主体、Agent 模式和技能选择集中在一个入口，再分发到视频、图片、长视频和工具链路。
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              { label: "参考素材", value: reference ? "已添加" : "可选" },
              { label: "@主体", value: subject || "商品/角色" },
              { label: "模式", value: mode },
              { label: "技能", value: activeSkill.label },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-[#f5f5f7] px-3 py-3">
                <div className="text-xs text-[#86868b]">{item.label}</div>
                <div className="mt-1 truncate text-sm font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-[#1d1d1f] p-4 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <Bot size={18} className="text-[#0a84ff]" />
            Agent 状态
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <Status text="流式对话接口已接入" />
            <Status text="本地 OpenAI Key 可覆盖" />
            <Status text="可继续分发到生成页" />
          </div>
          <Link className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1d1d1f]" href="/video">
            去生成视频
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="grid h-fit gap-4">
          <Panel title="历史创作">
            <button className="mb-3 w-full rounded-full bg-[#0071e3] px-3 py-2 text-sm font-semibold text-white" onClick={newConversation}>
              新建 Agent
            </button>
            <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1">
              {conversations.map((item) => (
                <button
                  key={item.id}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${conversationId === item.id ? "border-[#0071e3] bg-[#f2f8ff] text-[#0071e3]" : "border-black/10 bg-white hover:bg-[#f5f5f7]"}`}
                  onClick={() => setConversationId(item.id)}
                >
                  <div className="truncate font-semibold">{item.title}</div>
                  <div className="mt-1 text-xs text-[#86868b]">{item.skill_key}</div>
                </button>
              ))}
              {conversations.length === 0 ? <div className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-[#86868b]">暂无历史，先开始一个任务。</div> : null}
            </div>
          </Panel>
          <Panel title="OpenAI Key">
            <OpenAIKeyBox />
          </Panel>
        </aside>

        <main className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
          <div className="rounded-lg border border-black/10 bg-[#fbfbfd] p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <LabeledInput icon={FileUp} label="参考素材" value={reference} onChange={setReference} placeholder="粘贴商品图、视频、素材 ID 或竞品链接" />
              <LabeledInput icon={AtSign} label="@主体" value={subject} onChange={setSubject} placeholder="商品、角色、品牌或目标人群" />
            </div>
            <textarea
              className="mt-3 min-h-32 w-full resize-none rounded-lg border border-black/10 bg-white p-4 text-sm outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
              value={input}
              disabled={isSending}
              maxLength={4000}
              placeholder="输入你想生成、分析或改写的内容..."
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {modes.map((item) => (
                <button
                  key={item}
                  className={`rounded-full px-3 py-2 text-xs font-semibold ${mode === item ? "bg-[#1d1d1f] text-white" : "bg-white text-[#6e6e73]"}`}
                  onClick={() => setMode(item)}
                >
                  {item}
                </button>
              ))}
              <button className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={isSending || !input.trim()} onClick={send}>
                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                发送给 Agent
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {starterPrompts.map((prompt) => (
              <button key={prompt} className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-[#6e6e73] hover:border-[#0071e3] hover:text-[#0071e3]" onClick={() => setInput(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          <div className="mt-4 grid max-h-[520px] gap-3 overflow-y-auto pr-1">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[86%] rounded-lg border px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-auto border-[#0071e3]/20 bg-[#0071e3] text-white"
                    : "border-black/10 bg-white text-[#1d1d1f]"
                }`}
              >
                {message.content || (message.role === "assistant" ? "生成中..." : "")}
              </div>
            ))}
          </div>
        </main>

        <aside className="grid h-fit gap-4">
          <Panel title="技能选择">
            <div className="grid gap-2">
              {skills.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    className={`rounded-lg border p-3 text-left transition ${skill === item.key ? "border-[#0071e3] bg-[#f2f8ff]" : "border-black/10 bg-white hover:bg-[#f5f5f7]"}`}
                    onClick={() => setSkill(item.key)}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Icon size={16} className={skill === item.key ? "text-[#0071e3]" : "text-[#86868b]"} />
                      {item.label}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-[#86868b]">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </Panel>
          <Panel title="下一步">
            <div className="grid gap-2 text-sm">
              <QuickLink href="/image" icon={ImageIcon} text="生成商品图片" />
              <QuickLink href="/video" icon={Video} text="生成带货视频" />
              <QuickLink href="/long-video" icon={WandSparkles} text="编排长视频" />
              <QuickLink href="/tools" icon={Sparkles} text="进入工具箱" />
            </div>
          </Panel>
        </aside>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Status({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-white/75">
      <CheckCircle2 size={15} className="text-[#30d158]" />
      {text}
    </div>
  );
}

function LabeledInput({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: typeof FileUp;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="grid gap-1 rounded-lg bg-white px-3 py-2 text-xs text-[#86868b]">
      <span className="flex items-center gap-1 font-semibold text-[#1d1d1f]">
        <Icon size={14} className="text-[#0071e3]" />
        {label}
      </span>
      <input
        className="bg-transparent text-sm text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function QuickLink({ href, icon: Icon, text }: { href: string; icon: typeof ImageIcon; text: string }) {
  return (
    <Link className="flex items-center justify-between rounded-lg bg-[#f5f5f7] px-3 py-3 font-semibold text-[#1d1d1f]" href={href}>
      <span className="flex items-center gap-2">
        <Icon size={16} className="text-[#0071e3]" />
        {text}
      </span>
      <ArrowUpRight size={15} className="text-[#86868b]" />
    </Link>
  );
}

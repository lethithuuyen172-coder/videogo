import Link from "next/link";
import {
  Boxes,
  Brush,
  CircleDollarSign,
  Image as ImageIcon,
  MessageSquareText,
  Scissors,
  Sparkles,
  Video,
  WandSparkles,
} from "lucide-react";

const creationFlows = [
  {
    href: "/chat",
    icon: MessageSquareText,
    title: "AI Agent 对话",
    desc: "输入商品、脚本、广告目标，由 Agent 拆解创作任务。",
    accent: "bg-[#0071e3]",
  },
  {
    href: "/video",
    icon: Video,
    title: "AI 视频生成",
    desc: "支持文生视频、模型选择、同步生成和队列任务。",
    accent: "bg-[#ff9f0a]",
  },
  {
    href: "/long-video",
    icon: Sparkles,
    title: "长视频编排",
    desc: "多镜头 prompt、角色记忆、声音记忆和产品一致性。",
    accent: "bg-[#af52de]",
  },
  {
    href: "/image",
    icon: ImageIcon,
    title: "AI 图片生成",
    desc: "商品图、海报图、参考图扩展和多比例出图。",
    accent: "bg-[#34c759]",
  },
  {
    href: "/canvas",
    icon: Brush,
    title: "在线画布",
    desc: "编辑封面、商品图、广告素材并导出 PNG。",
    accent: "bg-[#ff375f]",
  },
  {
    href: "/tools",
    icon: Scissors,
    title: "工具箱",
    desc: "画质增强、字幕擦除、去水印、爆款裂变、提示词工具。",
    accent: "bg-[#5856d6]",
  },
];

const pipeline = ["上传商品/素材", "Agent 生成脚本", "图片/视频生成", "画布包装", "工具增强", "资产沉淀"];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="rounded-lg border border-black/10 bg-white/80 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">VideoGo Creative OS</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
              从商品到可投放视频的一站式 AI 工作台
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#6e6e73]">
              覆盖 AI 对话、视频、长视频、图片、画布、工具箱、资产和积分，先复刻主流 AI 创作站的完整功能面，再在带货转化链路上继续迭代。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rounded-full bg-[#0071e3] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.28)]" href="/chat">
                开始创作
              </Link>
              <Link className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#0071e3]" href="/long-video">
                编排长视频
              </Link>
            </div>
          </div>
          <div className="rounded-lg bg-[#1d1d1f] p-5 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Boxes size={18} />
              创作流水线
            </div>
            <div className="mt-4 grid gap-2">
              {pipeline.map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-3 text-sm">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-semibold text-[#1d1d1f]">
                    {index + 1}
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {creationFlows.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              className="group rounded-lg border border-black/10 bg-white/85 p-5 shadow-[0_10px_34px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(0,0,0,0.09)]"
              href={item.href}
            >
              <div className={`grid h-11 w-11 place-items-center rounded-full text-white ${item.accent}`}>
                <Icon size={20} />
              </div>
              <div className="mt-5 text-lg font-semibold">{item.title}</div>
              <p className="mt-2 text-sm leading-6 text-[#6e6e73]">{item.desc}</p>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0071e3]">
                打开模块
                <WandSparkles size={16} className="transition group-hover:rotate-12" />
              </div>
            </Link>
          );
        })}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        {[
          { href: "/assets", title: "资产中心", text: "集中管理上传素材、生成结果和可复用商品资产。" },
          { href: "/credits", title: "积分与充值", text: "查看额度、充值套餐、消耗记录和任务成本。" },
          { href: "/discover", title: "发现社区", text: "沉淀优秀作品、分镜结构和可复刻创作范式。" },
        ].map((item) => (
          <Link key={item.href} className="rounded-lg border border-black/10 bg-white/70 p-4 text-sm shadow-sm" href={item.href}>
            <div className="flex items-center gap-2 font-semibold">
              <CircleDollarSign size={16} className="text-[#0071e3]" />
              {item.title}
            </div>
            <p className="mt-2 leading-6 text-[#6e6e73]">{item.text}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}

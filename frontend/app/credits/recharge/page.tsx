"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, CreditCard, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";

const packs = [
  { credits: 1000, label: "入门包", desc: "适合测试图片、短视频和工具流程" },
  { credits: 3000, label: "创作者包", desc: "适合每日素材生成和脚本测试" },
  { credits: 5000, label: "增长包", desc: "适合批量视频、图片和画布产出" },
  { credits: 10000, label: "团队包", desc: "适合多账号、多商品矩阵创作" },
  { credits: 30000, label: "投放包", desc: "适合广告素材批量生产" },
  { credits: 50000, label: "企业包", desc: "适合稳定投流和素材工厂" },
];

type RechargeOrder = {
  out_trade_no: string;
  credits: number;
  amount_cents: number;
  status: string;
  checkout_url?: string;
};

export default function RechargePage() {
  const [order, setOrder] = useState<RechargeOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingCredits, setLoadingCredits] = useState<number | null>(null);
  const [selected, setSelected] = useState(5000);

  const createOrder = async (credits: number) => {
    setError(null);
    setLoadingCredits(credits);
    setSelected(credits);
    try {
      setOrder(await apiClient.post<RechargeOrder>("/credits/recharge-orders", { credits }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建充值订单失败");
    } finally {
      setLoadingCredits(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <Link className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0071e3]" href="/credits">
        <ArrowLeft size={16} />
        返回积分中心
      </Link>
      <section className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">Recharge</p>
        <h1 className="mt-2 text-4xl font-semibold md:text-5xl">积分充值</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">
          选择适合的视频、图片和工具处理套餐。开发环境会返回支付链接，生产环境接 Stripe Checkout。
        </p>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {packs.map((pack) => (
            <button
              key={pack.credits}
              className={`rounded-lg border p-5 text-left transition ${
                selected === pack.credits
                  ? "border-[#0071e3] bg-[#f2f8ff] shadow-[0_14px_36px_rgba(0,113,227,0.14)]"
                  : "border-black/10 bg-white/85 hover:bg-white"
              }`}
              disabled={loadingCredits !== null}
              onClick={() => createOrder(pack.credits)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#0071e3]">{pack.label}</div>
                  <div className="mt-2 text-3xl font-semibold">{pack.credits}</div>
                  <div className="mt-1 text-sm text-[#6e6e73]">约 ¥{pack.credits / 100}</div>
                </div>
                {selected === pack.credits ? <Check className="text-[#0071e3]" size={20} /> : null}
              </div>
              <p className="mt-4 text-sm leading-6 text-[#6e6e73]">{pack.desc}</p>
              <div className="mt-4 text-xs font-semibold text-[#86868b]">{loadingCredits === pack.credits ? "创建订单中..." : "点击创建订单"}</div>
            </button>
          ))}
        </div>

        <aside className="h-fit rounded-lg border border-black/10 bg-[#1d1d1f] p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <CreditCard size={18} className="text-[#0a84ff]" />
            支付订单
          </div>
          {order ? (
            <div className="mt-4 rounded-lg bg-white/10 p-4 text-sm leading-6">
              <div className="font-semibold">订单 {order.out_trade_no}</div>
              <div className="mt-1 text-white/70">{order.credits} 积分 · {order.status}</div>
              <div className="mt-1 text-xs text-[#ffcc00]">开发模式支付链接</div>
              {order.checkout_url ? (
                <a className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#0071e3] px-4 text-sm font-semibold text-white" href={order.checkout_url}>
                  前往支付
                </a>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-white/10 p-4 text-sm leading-6 text-white/70">
              选择左侧套餐后创建订单。支付完成后会通过 Webhook 幂等入账。
            </div>
          )}
          {loadingCredits ? <div className="mt-4 inline-flex items-center gap-2 text-sm text-white/70"><Loader2 size={16} className="animate-spin" />创建中</div> : null}
          {error ? <p className="mt-4 text-sm text-[#ff9f0a]">{error}</p> : null}
        </aside>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, CircleDollarSign, Clock3, CreditCard, ReceiptText, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api";

type Balance = {
  credit_balance: number;
  frozen_credits: number;
  available_credits: number;
};

type CreditRecord = {
  id: string;
  record_type: string;
  amount: number;
  description?: string;
  created_at: string;
};

const typeLabels: Record<string, string> = {
  deduct: "消费",
  recharge: "充值",
  refund: "退款",
  freeze: "冻结",
  adjust: "调整",
};

const costExamples = [
  { label: "AI 图片", value: "10-80 / 张" },
  { label: "AI 视频", value: "64+ / 条" },
  { label: "画质增强", value: "30 / 次" },
  { label: "长视频", value: "300+ / 项" },
];

export default function CreditsPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [records, setRecords] = useState<CreditRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([apiClient.get<Balance>("/credits/balance"), apiClient.get<CreditRecord[]>("/credits/records")])
      .then(([nextBalance, nextRecords]) => {
        setBalance(nextBalance);
        setRecords(nextRecords);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "请先登录后查看积分"));
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="rounded-lg border border-black/10 bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0071e3]">Credits</p>
            <h1 className="mt-2 text-4xl font-semibold md:text-5xl">积分中心</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e6e73]">
              查看余额、冻结额度、消耗记录和各类 AI 任务的预计成本，支撑 DA 类生成站的商业闭环。
            </p>
          </div>
          <div className="rounded-lg bg-[#1d1d1f] p-5 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
              <CircleDollarSign size={18} className="text-[#0a84ff]" />
              当前余额
            </div>
            <div className="mt-3 text-5xl font-semibold">{balance?.credit_balance ?? "--"}</div>
            <div className="mt-2 text-sm text-white/65">
              冻结 {balance?.frozen_credits ?? "--"} · 可用 {balance?.available_credits ?? "--"}
            </div>
            {balance && balance.available_credits < 100 ? (
              <div className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/75">积分不足，去充值</div>
            ) : null}
            <Link className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-4 py-2 text-sm font-semibold text-white" href="/credits/recharge">
              充值积分
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {error ? <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="grid h-fit gap-4">
          <Panel title="任务成本">
            <div className="grid gap-2">
              {costExamples.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-[#f5f5f7] px-3 py-3 text-sm">
                  <span>{item.label}</span>
                  <span className="font-semibold text-[#0071e3]">{item.value}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="账户状态">
            <div className="grid gap-3 text-sm text-[#6e6e73]">
              <Status icon={ShieldCheck} text="Stripe Webhook 幂等入账" />
              <Status icon={CreditCard} text="套餐订单与支付链接" />
              <Status icon={ReceiptText} text="消费、退款、冻结记录" />
            </div>
          </Panel>
        </aside>

        <main className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-[0_10px_34px_rgba(0,0,0,0.05)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">消耗记录</h2>
            <Link className="rounded-full bg-[#f5f5f7] px-4 py-2 text-sm font-semibold text-[#0071e3]" href="/credits/recharge">购买套餐</Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-black/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f5f5f7] text-xs text-[#86868b]">
                <tr>
                  <th className="px-3 py-3">类型</th>
                  <th className="px-3 py-3">说明</th>
                  <th className="px-3 py-3">积分</th>
                  <th className="px-3 py-3">时间</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-[#86868b]" colSpan={4}>暂无记录</td>
                  </tr>
                ) : null}
                {records.map((record) => (
                  <tr key={record.id} className="border-t border-black/10">
                    <td className="px-3 py-3">{typeLabels[record.record_type] ?? record.record_type}</td>
                    <td className="px-3 py-3 text-[#6e6e73]">{record.description ?? "-"}</td>
                    <td className={`px-3 py-3 font-semibold ${record.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {record.amount > 0 ? `+${record.amount}` : record.amount}
                    </td>
                    <td className="px-3 py-3 text-[#86868b]">{new Date(record.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
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

function Status({ icon: Icon, text }: { icon: typeof Clock3; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#f5f5f7] px-3 py-3">
      <Icon size={16} className="text-[#0071e3]" />
      {text}
    </div>
  );
}

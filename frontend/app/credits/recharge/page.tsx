"use client";

import { useState } from "react";
import { Panel } from "@/components/Panel";
import { apiClient } from "@/lib/api";

const packs = [1000, 3000, 5000, 10000, 30000, 50000];

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

  const createOrder = async (credits: number) => {
    setError(null);
    try {
      setOrder(await apiClient.post<RechargeOrder>("/credits/recharge-orders", { credits }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建充值订单失败");
    }
  };

  return (
    <Panel title="积分充值">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((credits) => (
          <button
            key={credits}
            className="rounded-md border border-line bg-white p-4 text-left hover:bg-panel"
            onClick={() => createOrder(credits)}
          >
            <div className="text-lg font-semibold">{credits} 积分</div>
            <div className="text-sm text-slate-500">约 ¥{credits / 100}</div>
          </button>
        ))}
      </div>
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {order ? (
        <div className="mt-4 rounded-md border border-line bg-white p-4 text-sm">
          <div className="font-semibold">订单 {order.out_trade_no}</div>
          <div className="mt-1 text-slate-500">
            {order.credits} 积分 · {order.status}
          </div>
          {order.checkout_url ? (
            <a className="mt-3 inline-block rounded-md bg-accent px-3 py-2 text-white" href={order.checkout_url}>
              前往支付
            </a>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

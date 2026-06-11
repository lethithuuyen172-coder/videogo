"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Panel } from "@/components/Panel";
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
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Panel title="积分余额">
        <div className="text-3xl font-semibold">{balance?.credit_balance ?? "--"}</div>
        <div className="mt-1 text-sm text-slate-500">
          冻结 {balance?.frozen_credits ?? "--"}，可用 {balance?.available_credits ?? "--"}
        </div>
        {balance && balance.available_credits <= 0 ? (
          <div className="mt-3 rounded-md bg-yellow-50 p-3 text-sm text-signal">积分不足，去充值</div>
        ) : null}
        <Link className="mt-4 inline-block rounded-md bg-accent px-3 py-2 text-sm text-white" href="/credits/recharge">
          充值
        </Link>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </Panel>
      <Panel title="消耗记录">
        <table className="w-full text-left text-sm">
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td className="py-2 text-slate-500">暂无记录</td>
              </tr>
            ) : null}
            {records.map((record) => (
              <tr key={record.id} className="border-b border-line">
                <td className="py-2">{record.description ?? typeLabels[record.record_type] ?? record.record_type}</td>
                <td className={record.amount >= 0 ? "text-green-600" : "text-red-600"}>{record.amount > 0 ? `+${record.amount}` : record.amount}</td>
                <td>{new Date(record.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

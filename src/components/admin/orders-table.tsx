"use client";

import Link from "next/link";
import { useState } from "react";
import type { Order } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import { OrderStatusBadge } from "@/components/status-badge";

const STATUSES = ["pending", "placed", "processing", "shipped", "delivered", "cancelled"];
const PAY = ["unpaid", "paid", "failed", "refunded"];

export function OrdersTable({ initial, currency }: { initial: Order[]; currency: string }) {
  const [list, setList] = useState(initial);

  async function update(id: number, patch: Record<string, string>) {
    const res = await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const d = await res.json();
    if (res.ok) setList((l) => l.map((o) => (o.id === id ? d.order : o)));
  }

  if (list.length === 0) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No orders yet.</div>;

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Deliver to</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {list.map((o) => (
            <tr key={o.id}>
              <td className="px-4 py-3">
                <Link href={`/orders/${o.orderNumber}`} className="font-semibold text-indigo-700 hover:underline">{o.orderNumber}</Link>
                <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString()}</p>
              </td>
              <td className="px-4 py-3">
                <p>{o.shippingAddress.fullName}</p>
                <p className="text-xs text-slate-500">{o.email}</p>
              </td>
              <td className="px-4 py-3 text-xs text-slate-600">
                {o.deliveryMethod === "pickup" ? "Store pickup" : `${o.shippingAddress.city}, ${o.shippingAddress.country}`}
                <p className="text-slate-400">{o.shippingZone}</p>
              </td>
              <td className="px-4 py-3 font-semibold">{formatMoney(o.totalCents, o.currency || currency)}</td>
              <td className="px-4 py-3">
                <p className="text-xs uppercase text-slate-500">{o.paymentMethod}</p>
                <select value={o.paymentStatus} onChange={(e) => update(o.id, { paymentStatus: e.target.value })} className="mt-1 rounded border border-slate-300 px-2 py-1 text-xs">
                  {PAY.map((p) => <option key={p}>{p}</option>)}
                </select>
              </td>
              <td className="px-4 py-3">
                <OrderStatusBadge status={o.status} />
                <select value={o.status} onChange={(e) => update(o.id, { status: e.target.value })} className="mt-1 block rounded border border-slate-300 px-2 py-1 text-xs">
                  {STATUSES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

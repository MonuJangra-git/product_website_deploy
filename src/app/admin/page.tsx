import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { getGatewayStatus } from "@/lib/payments";
import { OrdersTable } from "@/components/admin/orders-table";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const s = await getSettings();
  const [list, [stats], [prodCount]] = await Promise.all([
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100),
    db
      .select({
        total: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(case when payment_status = 'paid' or payment_method = 'cod' then total_cents else 0 end), 0)::int`,
        pending: sql<number>`sum(case when status in ('placed','processing') then 1 else 0 end)::int`,
      })
      .from(orders),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.active, true)),
  ]);
  const gateways = getGatewayStatus(s.codEnabled);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Orders", String(stats.total)],
          ["Revenue", formatMoney(stats.revenue, s.currency)],
          ["To fulfil", String(stats.pending || 0)],
          ["Active products", String(prodCount.count)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">{k}</p>
            <p className="mt-1 text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {gateways.map((g) => (
          <span key={g.id} className={`rounded-full px-3 py-1 font-semibold ${g.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
            {g.name}: {g.enabled ? `enabled${g.mode ? ` (${g.mode})` : ""}` : "not configured"}
          </span>
        ))}
      </div>
      <OrdersTable initial={list} currency={s.currency} />
    </div>
  );
}

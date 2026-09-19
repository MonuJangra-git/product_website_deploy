import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { addresses, orders } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { OrderStatusBadge } from "@/components/status-badge";
import { AddressManager } from "@/components/address-manager";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const [myOrders, myAddresses] = await Promise.all([
    db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)),
    db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt)),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Hi, {user.name}</h1>
          <p className="text-slate-600">{user.email}</p>
        </div>
        {user.role === "admin" && <Link href="/admin" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">Open admin</Link>}
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="mb-4 text-xl font-bold">Your orders</h2>
          {myOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
              No orders yet. <Link href="/products" className="text-indigo-700 underline">Start shopping</Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {myOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.orderNumber}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-400">
                    <div>
                      <p className="font-semibold">{o.orderNumber}</p>
                      <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString()} · {o.paymentMethod.toUpperCase()} · {o.paymentStatus}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={o.status} />
                      <span className="font-bold">{formatMoney(o.totalCents, o.currency)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-4 text-xl font-bold">Delivery addresses</h2>
          <AddressManager initial={myAddresses} />
        </section>
      </div>
    </main>
  );
}

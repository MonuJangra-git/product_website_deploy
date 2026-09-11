import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatMoney } from "@/lib/money";
import { OrderStatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ error?: string; cancelled?: string }>;
}) {
  const { orderNumber } = await params;
  const { error, cancelled } = await searchParams;
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) notFound();
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const a = order.shippingAddress;
  const paid = order.paymentStatus === "paid";
  const steps = ["placed", "processing", "shipped", "delivered"];
  const stepIdx = steps.indexOf(order.status);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {(error || cancelled) && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {cancelled ? "Payment was cancelled. Your order is saved as pending — you can contact support to retry." : "We could not confirm the payment. If you were charged, please contact support with your order number."}
        </div>
      )}
      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Order</p>
            <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <OrderStatusBadge status={order.status} />
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${paid ? "bg-emerald-100 text-emerald-800" : order.paymentStatus === "failed" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
              {paid ? "Paid" : order.paymentMethod === "cod" ? "Pay on delivery" : order.paymentStatus}
            </span>
          </div>
        </div>

        {order.status !== "cancelled" && (
          <ol className="mt-8 grid grid-cols-4 gap-2 text-center text-xs">
            {steps.map((s, i) => (
              <li key={s} className="flex flex-col items-center gap-2">
                <span className={`grid h-8 w-8 place-items-center rounded-full font-bold ${i <= stepIdx ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"}`}>{i + 1}</span>
                <span className={`capitalize ${i <= stepIdx ? "font-semibold text-slate-900" : "text-slate-400"}`}>{s}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="font-semibold">{order.deliveryMethod === "pickup" ? "Store pickup" : "Delivering to"}</p>
            <p className="mt-1">{a.fullName}</p>
            {order.deliveryMethod !== "pickup" && (
              <>
                <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                <p>{a.city}{a.state ? `, ${a.state}` : ""} {a.postalCode}</p>
                <p>{a.country}</p>
              </>
            )}
            {a.phone && <p>📞 {a.phone}</p>}
            {a.lat && a.lng && (
              <a className="mt-1 inline-block text-indigo-700 underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${a.lat}&mlon=${a.lng}#map=16/${a.lat}/${a.lng}`}>View pinned location</a>
            )}
            {order.shippingZone && <p className="mt-2 text-slate-500">Zone: {order.shippingZone}</p>}
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="font-semibold">Payment</p>
            <p className="mt-1 capitalize">{order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod}</p>
            {order.paymentRef && <p className="break-all text-xs text-slate-500">Ref: {order.paymentRef}</p>}
            <p className="mt-2 text-slate-600">Confirmation sent to {order.email}</p>
            {order.notes && <p className="mt-2 italic text-slate-600">“{order.notes}”</p>}
          </div>
        </div>

        <ul className="mt-8 divide-y divide-slate-100">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <span className="flex-1 text-sm">{it.name} × {it.quantity}</span>
              <span className="font-semibold">{formatMoney(it.priceCents * it.quantity, order.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(order.subtotalCents, order.currency)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{order.shippingCents ? formatMoney(order.shippingCents, order.currency) : "Free"}</span></div>
          {order.taxCents > 0 && <div className="flex justify-between"><span>Tax</span><span>{formatMoney(order.taxCents, order.currency)}</span></div>}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><span>Total</span><span>{formatMoney(order.totalCents, order.currency)}</span></div>
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <Link href="/products" className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">Continue shopping</Link>
        <Link href="/account" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold">My orders</Link>
      </div>
    </main>
  );
}

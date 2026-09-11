"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatMoney } from "@/lib/money";

export default function CartPage() {
  const { items, setQty, remove, subtotalCents, hydrated } = useCart();
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    fetch("/api/store")
      .then((r) => r.json())
      .then((d) => setCurrency(d.currency))
      .catch(() => {});
  }, []);

  if (!hydrated) return <main className="mx-auto max-w-5xl px-4 py-12 text-slate-500">Loading cart…</main>;

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-20 text-center">
        <p className="text-5xl">🛒</p>
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <Link href="/products" className="mt-6 inline-block rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white">
          Browse products
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold">Shopping cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.productId} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.imageUrl} alt={it.name} className="h-24 w-24 flex-none rounded-xl object-cover" />
              <div className="flex flex-1 flex-col">
                <Link href={`/products/${it.slug}`} className="font-semibold hover:text-indigo-700">
                  {it.name}
                </Link>
                <p className="text-sm text-slate-500">{formatMoney(it.priceCents, currency)} each</p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-slate-300 text-sm">
                    <button onClick={() => setQty(it.productId, it.quantity - 1)} className="px-3 py-1.5">−</button>
                    <span className="w-8 text-center font-semibold">{it.quantity}</span>
                    <button onClick={() => setQty(it.productId, Math.min(it.stock || 99, it.quantity + 1))} className="px-3 py-1.5">+</button>
                  </div>
                  <p className="font-bold">{formatMoney(it.priceCents * it.quantity, currency)}</p>
                  <button onClick={() => remove(it.productId)} className="text-sm text-rose-600 hover:underline">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold">Summary</h2>
          <div className="mt-4 flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="font-semibold">{formatMoney(subtotalCents, currency)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Shipping & taxes calculated at checkout based on your delivery location.</p>
          <Link href="/checkout" className="mt-6 block rounded-full bg-indigo-600 py-3 text-center font-semibold text-white hover:bg-indigo-700">
            Proceed to checkout
          </Link>
          <Link href="/products" className="mt-3 block text-center text-sm text-slate-600 hover:underline">
            Continue shopping
          </Link>
        </aside>
      </div>
    </main>
  );
}

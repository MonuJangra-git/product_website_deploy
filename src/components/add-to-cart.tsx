"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import type { Product } from "@/db/schema";

export function AddToCartButton({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const out = product.stock <= 0;

  function handle() {
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        stock: product.stock,
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  if (compact) {
    return (
      <button
        onClick={handle}
        disabled={out}
        className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {added ? "Added ✓" : "Add"}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center rounded-full border border-slate-300">
        <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-4 py-2 text-lg leading-none">
          −
        </button>
        <span className="w-8 text-center font-semibold">{qty}</span>
        <button onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))} className="px-4 py-2 text-lg leading-none">
          +
        </button>
      </div>
      <button
        onClick={handle}
        disabled={out}
        className="flex-1 rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:flex-none"
      >
        {out ? "Out of stock" : added ? "Added to cart ✓" : "Add to cart"}
      </button>
    </div>
  );
}

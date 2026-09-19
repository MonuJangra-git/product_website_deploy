import Link from "next/link";
import type { Product } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import { AddToCartButton } from "@/components/add-to-cart";

export function ProductCard({ product, currency }: { product: Product; currency: string }) {
  const discount =
    product.compareAtCents && product.compareAtCents > product.priceCents
      ? Math.round(((product.compareAtCents - product.priceCents) / product.compareAtCents) * 100)
      : 0;
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-lg">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-2 py-1 text-xs font-bold text-white">-{discount}%</span>
        )}
        {product.stock <= 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-slate-800 px-2 py-1 text-xs font-bold text-white">Sold out</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">{product.brand || product.category}</p>
        <Link href={`/products/${product.slug}`} className="line-clamp-2 font-semibold text-slate-900 hover:text-indigo-700">
          {product.name}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-lg font-bold text-slate-900">{formatMoney(product.priceCents, currency)}</p>
            {product.compareAtCents && product.compareAtCents > product.priceCents && (
              <p className="text-xs text-slate-400 line-through">{formatMoney(product.compareAtCents, currency)}</p>
            )}
          </div>
          <AddToCartButton product={product} compact />
        </div>
      </div>
    </div>
  );
}

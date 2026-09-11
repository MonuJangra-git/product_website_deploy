import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { products } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { AddToCartButton } from "@/components/add-to-cart";
import { ProductCard } from "@/components/product-card";
import { getEnabledMethods } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!product || !product.active) notFound();
  const s = await getSettings();
  const related = await db
    .select()
    .from(products)
    .where(and(eq(products.category, product.category), ne(products.id, product.id), eq(products.active, true)))
    .limit(4);
  const methods = getEnabledMethods(s.codEnabled);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-indigo-700">Home</Link> / <Link href="/products" className="hover:text-indigo-700">Products</Link> /{" "}
        <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-indigo-700">{product.category}</Link>
      </nav>
      <div className="grid gap-10 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.imageUrl} alt={product.name} className="aspect-square w-full object-cover" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">{product.brand}</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight">{product.name}</h1>
          <div className="mt-4 flex items-end gap-3">
            <p className="text-3xl font-extrabold">{formatMoney(product.priceCents, s.currency)}</p>
            {product.compareAtCents && product.compareAtCents > product.priceCents && (
              <p className="pb-1 text-lg text-slate-400 line-through">{formatMoney(product.compareAtCents, s.currency)}</p>
            )}
          </div>
          <p className={`mt-2 text-sm font-medium ${product.stock > 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {product.stock > 0 ? `In stock (${product.stock} available)` : "Out of stock"}
          </p>
          <p className="mt-6 leading-relaxed text-slate-700">{product.description}</p>
          <div className="mt-8">
            <AddToCartButton product={product} />
          </div>
          <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p className="font-semibold text-slate-900">Delivery</p>
              <p>Ships to your chosen location. Shipping cost calculated at checkout.</p>
            </div>
            <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <p className="font-semibold text-slate-900">Payment options</p>
              <p>{methods.map((m) => m.name).join(", ") || "No methods configured"}</p>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-2xl font-bold">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} currency={s.currency} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

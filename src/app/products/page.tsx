import Link from "next/link";
import { db } from "@/db";
import { products } from "@/db/schema";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { ProductCard } from "@/components/product-card";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const { q = "", category = "", sort = "newest" } = await searchParams;
  const s = await getSettings();

  const conditions = [eq(products.active, true)];
  if (q) conditions.push(or(ilike(products.name, `%${q}%`), ilike(products.brand, `%${q}%`), ilike(products.description, `%${q}%`))!);
  if (category) conditions.push(eq(products.category, category));

  const orderBy =
    sort === "price_asc" ? asc(products.priceCents) : sort === "price_desc" ? desc(products.priceCents) : sort === "name" ? asc(products.name) : desc(products.createdAt);

  const [list, cats] = await Promise.all([
    db.select().from(products).where(and(...conditions)).orderBy(orderBy),
    db.select({ category: products.category, count: sql<number>`count(*)::int` }).from(products).where(eq(products.active, true)).groupBy(products.category),
  ]);

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ q, category, sort, ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/products?${p.toString()}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{category || (q ? `Results for “${q}”` : "All products")}</h1>
          <p className="text-sm text-slate-600">{list.length} item(s)</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-600">Sort:</span>
          {[
            ["newest", "Newest"],
            ["price_asc", "Price ↑"],
            ["price_desc", "Price ↓"],
            ["name", "Name"],
          ].map(([v, label]) => (
            <Link key={v} href={qs({ sort: v })} className={`rounded-full px-3 py-1.5 ${sort === v ? "bg-slate-900 text-white" : "bg-white border border-slate-300 hover:border-slate-500"}`}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4">
          <form className="mb-4 md:hidden">
            <input name="q" defaultValue={q} placeholder="Search…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </form>
          <p className="mb-2 text-sm font-semibold">Categories</p>
          <ul className="space-y-1 text-sm">
            <li>
              <Link href={qs({ category: "" })} className={`block rounded-md px-2 py-1.5 ${!category ? "bg-indigo-50 font-semibold text-indigo-700" : "hover:bg-slate-50"}`}>
                All
              </Link>
            </li>
            {cats.map((c) => (
              <li key={c.category}>
                <Link href={qs({ category: c.category })} className={`flex justify-between rounded-md px-2 py-1.5 ${category === c.category ? "bg-indigo-50 font-semibold text-indigo-700" : "hover:bg-slate-50"}`}>
                  <span>{c.category}</span>
                  <span className="text-slate-400">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <div>
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">No products found.</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {list.map((p) => (
                <ProductCard key={p.id} product={p} currency={s.currency} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

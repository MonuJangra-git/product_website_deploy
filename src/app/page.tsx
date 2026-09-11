import Link from "next/link";
import { db } from "@/db";
import { products } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { ProductCard } from "@/components/product-card";
import { getSettings } from "@/lib/settings";
import { getEnabledMethods } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const s = await getSettings();
  const [featured, latest] = await Promise.all([
    db.select().from(products).where(and(eq(products.active, true), eq(products.featured, true))).orderBy(desc(products.createdAt)).limit(4),
    db.select().from(products).where(eq(products.active, true)).orderBy(desc(products.createdAt)).limit(8),
  ]);
  const categories = Array.from(new Set(latest.map((p) => p.category)));
  const methods = getEnabledMethods(s.codEnabled);

  return (
    <main>
      <section className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-200">New season</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">{s.storeTagline}</h1>
            <p className="mt-4 max-w-md text-indigo-100">
              Genuine brands, fast delivery to your location, and secure payments
              {methods.length ? ` via ${methods.map((m) => m.name).join(", ")}` : ""}.
            </p>
            <div className="mt-8 flex gap-3">
              <Link href="/products" className="rounded-full bg-white px-6 py-3 font-semibold text-indigo-700 hover:bg-indigo-50">
                Shop now
              </Link>
              <Link href="/track" className="rounded-full border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">
                Track order
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {featured.slice(0, 4).map((p) => (
              <Link key={p.id} href={`/products/${p.slug}`} className="overflow-hidden rounded-2xl bg-white/10 p-2 backdrop-blur transition hover:bg-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt={p.name} className="aspect-square w-full rounded-xl object-cover" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["🚚", "Delivery to your location", "Choose your address or use GPS at checkout"],
            ["🔒", "Secure payments", methods.length ? methods.map((m) => m.name).join(" · ") : "Configure gateways via env vars"],
            ["↩️", "Easy returns", "30-day hassle-free return policy"],
          ].map(([icon, title, sub]) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-slate-600">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link key={c} href={`/products?category=${encodeURIComponent(c)}`} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:border-indigo-500 hover:text-indigo-700">
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Featured products</h2>
          <Link href="/products" className="text-sm font-semibold text-indigo-700 hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {latest.map((p) => (
            <ProductCard key={p.id} product={p} currency={s.currency} />
          ))}
        </div>
      </section>
    </main>
  );
}

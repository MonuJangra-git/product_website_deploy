import { db } from "@/db";
import { products } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function GET() {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const list = await db.select().from(products).orderBy(desc(products.createdAt));
  return Response.json({ products: list });
}

export async function POST(req: Request) {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const b = await req.json().catch(() => ({}));
  if (!b.name || !b.priceCents) return Response.json({ error: "Name and price are required" }, { status: 400 });
  const slug = slugify(b.slug || b.name) + (b.slug ? "" : `-${Math.random().toString(36).slice(2, 6)}`);
  const [row] = await db
    .insert(products)
    .values({
      slug,
      name: b.name,
      brand: b.brand || "",
      category: b.category || "General",
      description: b.description || "",
      priceCents: Math.round(Number(b.priceCents)),
      compareAtCents: b.compareAtCents ? Math.round(Number(b.compareAtCents)) : null,
      imageUrl: b.imageUrl || "",
      stock: Number(b.stock || 0),
      featured: Boolean(b.featured),
      active: b.active !== false,
    })
    .returning();
  return Response.json({ product: row });
}

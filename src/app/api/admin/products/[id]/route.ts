import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const [row] = await db
    .update(products)
    .set({
      name: b.name,
      brand: b.brand ?? "",
      category: b.category || "General",
      description: b.description ?? "",
      priceCents: Math.round(Number(b.priceCents)),
      compareAtCents: b.compareAtCents ? Math.round(Number(b.compareAtCents)) : null,
      imageUrl: b.imageUrl ?? "",
      stock: Number(b.stock || 0),
      featured: Boolean(b.featured),
      active: b.active !== false,
    })
    .where(eq(products.id, Number(id)))
    .returning();
  return Response.json({ product: row });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;
  await db.update(products).set({ active: false }).where(eq(products.id, Number(id)));
  return Response.json({ ok: true });
}

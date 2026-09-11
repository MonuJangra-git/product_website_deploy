import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

const STATUSES = ["pending", "placed", "processing", "shipped", "delivered", "cancelled"];
const PAY = ["unpaid", "paid", "failed", "refunded"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (b.status && STATUSES.includes(b.status)) set.status = b.status;
  if (b.paymentStatus && PAY.includes(b.paymentStatus)) set.paymentStatus = b.paymentStatus;
  const [row] = await db.update(orders).set(set).where(eq(orders.id, Number(id))).returning();
  return Response.json({ order: row });
}

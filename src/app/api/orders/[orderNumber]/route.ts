import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const email = new URL(req.url).searchParams.get("email")?.toLowerCase();
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  const user = await getCurrentUser();
  const allowed = user?.role === "admin" || (user && order.userId === user.id) || (email && order.email === email) || !order.userId;
  if (!allowed) return Response.json({ error: "Not authorised" }, { status: 403 });
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return Response.json({ order, items });
}

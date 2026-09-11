import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { paypalCaptureOrder } from "@/lib/payments";
import { getBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderNumber = url.searchParams.get("order") || "";
  const token = url.searchParams.get("token") || "";
  const base = await getBaseUrl();
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order || !token || order.paymentRef !== token) return Response.redirect(`${base}/orders/${orderNumber}?error=paypal`, 302);
  try {
    const cap = await paypalCaptureOrder(token);
    const paid = cap.status === "COMPLETED";
    await db
      .update(orders)
      .set({
        paymentStatus: paid ? "paid" : "failed",
        status: paid ? "placed" : "pending",
        paymentMeta: { ...(order.paymentMeta || {}), capture: cap },
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    return Response.redirect(`${base}/orders/${orderNumber}${paid ? "" : "?error=paypal"}`, 302);
  } catch {
    await db.update(orders).set({ paymentStatus: "failed", updatedAt: new Date() }).where(eq(orders.id, order.id));
    return Response.redirect(`${base}/orders/${orderNumber}?error=paypal`, 302);
  }
}

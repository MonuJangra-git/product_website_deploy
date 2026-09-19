import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { stripeRetrieveSession } from "@/lib/payments";
import { getBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderNumber = url.searchParams.get("order") || "";
  const sessionId = url.searchParams.get("session_id") || "";
  const base = await getBaseUrl();
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order || !sessionId || order.paymentRef !== sessionId) return Response.redirect(`${base}/orders/${orderNumber}?error=stripe`, 302);
  try {
    const session = await stripeRetrieveSession(sessionId);
    const paid = session.payment_status === "paid";
    await db
      .update(orders)
      .set({
        paymentStatus: paid ? "paid" : "failed",
        status: paid ? "placed" : "pending",
        paymentMeta: { ...(order.paymentMeta || {}), stripePaymentIntent: session.payment_intent },
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    return Response.redirect(`${base}/orders/${orderNumber}${paid ? "" : "?error=stripe"}`, 302);
  } catch {
    return Response.redirect(`${base}/orders/${orderNumber}?error=stripe`, 302);
  }
}

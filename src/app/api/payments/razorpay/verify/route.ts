import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { razorpayVerifySignature } from "@/lib/payments";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const { orderNumber, razorpay_order_id, razorpay_payment_id, razorpay_signature } = b;
  if (!orderNumber || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return Response.json({ error: "Missing payment fields" }, { status: 400 });
  }
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order || order.paymentRef !== razorpay_order_id) return Response.json({ error: "Order mismatch" }, { status: 400 });
  const ok = razorpayVerifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  await db
    .update(orders)
    .set({
      paymentStatus: ok ? "paid" : "failed",
      status: ok ? "placed" : "pending",
      paymentMeta: { ...(order.paymentMeta || {}), razorpayPaymentId: razorpay_payment_id, verified: ok },
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));
  if (!ok) return Response.json({ error: "Signature verification failed" }, { status: 400 });
  return Response.json({ ok: true, redirect: `/orders/${orderNumber}` });
}

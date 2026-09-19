import { db } from "@/db";
import { addresses, orderItems, orders, products, type ShippingAddress } from "@/db/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { calcShipping, calcTax, type DeliveryMethod } from "@/lib/shipping";
import { orderNumber } from "@/lib/money";
import { getBaseUrl } from "@/lib/url";
import {
  getEnabledMethods,
  paypalCreateOrder,
  razorpayCreateOrder,
  stripeCreateCheckoutSession,
  type PaymentMethodId,
} from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ orders: [] });
  const list = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
  return Response.json({ orders: list });
}

type Body = {
  items: { productId: number; quantity: number }[];
  email: string;
  address: ShippingAddress;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethodId;
  notes?: string;
  saveAddress?: boolean;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return Response.json({ error: "Cart is empty." }, { status: 400 });
  }
  const s = await getSettings();
  const user = await getCurrentUser();
  const email = String(body.email || user?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return Response.json({ error: "A valid email is required." }, { status: 400 });

  const a = body.address || ({} as ShippingAddress);
  const deliveryMethod: DeliveryMethod = body.deliveryMethod === "pickup" && s.pickupEnabled ? "pickup" : "standard";
  if (deliveryMethod === "standard" && (!a.fullName || !a.line1 || !a.city || !a.country)) {
    return Response.json({ error: "Please complete the delivery address." }, { status: 400 });
  }
  if (deliveryMethod === "pickup" && !a.fullName) {
    return Response.json({ error: "Please provide your name for pickup." }, { status: 400 });
  }

  const methods = getEnabledMethods(s.codEnabled);
  const method = methods.find((m) => m.id === body.paymentMethod);
  if (!method) return Response.json({ error: "Selected payment method is not available." }, { status: 400 });

  // Recompute prices server-side
  const ids = body.items.map((i) => Number(i.productId));
  const dbProducts = await db.select().from(products).where(inArray(products.id, ids));
  const lines = body.items.map((i) => {
    const p = dbProducts.find((x) => x.id === Number(i.productId));
    if (!p || !p.active) throw new Error(`Product ${i.productId} unavailable`);
    const qty = Math.max(1, Math.floor(Number(i.quantity) || 1));
    if (p.stock < qty) throw new Error(`Only ${p.stock} left of ${p.name}`);
    return { product: p, quantity: qty };
  });

  const subtotalCents = lines.reduce((acc, l) => acc + l.product.priceCents * l.quantity, 0);
  const ship = calcShipping(s, a.country || "US", subtotalCents, deliveryMethod);
  const taxCents = calcTax(s, subtotalCents);
  const totalCents = subtotalCents + ship.shippingCents + taxCents;
  const number = orderNumber();

  const shippingAddress: ShippingAddress = {
    fullName: a.fullName || "",
    phone: a.phone || "",
    line1: deliveryMethod === "pickup" ? "Store pickup" : a.line1 || "",
    line2: a.line2 || "",
    city: a.city || "",
    state: a.state || "",
    postalCode: a.postalCode || "",
    country: (a.country || "").toUpperCase(),
    lat: a.lat ?? null,
    lng: a.lng ?? null,
  };

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber: number,
      userId: user?.id ?? null,
      email,
      status: method.id === "cod" ? "placed" : "pending",
      paymentMethod: method.id,
      paymentStatus: "unpaid",
      currency: s.currency,
      subtotalCents,
      shippingCents: ship.shippingCents,
      taxCents,
      totalCents,
      shippingZone: ship.zone?.name ?? (deliveryMethod === "pickup" ? "Pickup" : ""),
      deliveryMethod,
      shippingAddress,
      notes: String(body.notes || "").slice(0, 1000),
    })
    .returning();

  await db.insert(orderItems).values(
    lines.map((l) => ({
      orderId: order.id,
      productId: l.product.id,
      name: l.product.name,
      imageUrl: l.product.imageUrl,
      priceCents: l.product.priceCents,
      quantity: l.quantity,
    })),
  );
  for (const l of lines) {
    await db.update(products).set({ stock: sql`${products.stock} - ${l.quantity}` }).where(eq(products.id, l.product.id));
  }

  if (user && body.saveAddress && deliveryMethod === "standard") {
    await db.insert(addresses).values({
      userId: user.id,
      label: "Saved at checkout",
      fullName: shippingAddress.fullName,
      phone: shippingAddress.phone,
      line1: shippingAddress.line1,
      line2: shippingAddress.line2 || "",
      city: shippingAddress.city,
      state: shippingAddress.state || "",
      postalCode: shippingAddress.postalCode || "",
      country: shippingAddress.country,
      lat: shippingAddress.lat ?? null,
      lng: shippingAddress.lng ?? null,
    });
  }

  const base = await getBaseUrl();
  const orderUrl = `${base}/orders/${number}`;

  try {
    if (method.id === "cod") {
      return Response.json({ orderNumber: number, redirect: `/orders/${number}` });
    }
    if (method.id === "razorpay") {
      const rp = await razorpayCreateOrder(totalCents, s.currency, number);
      await db.update(orders).set({ paymentRef: rp.id, paymentMeta: { razorpayOrderId: rp.id } }).where(eq(orders.id, order.id));
      return Response.json({
        orderNumber: number,
        razorpay: {
          key: method.publicKey,
          orderId: rp.id,
          amount: rp.amount,
          currency: rp.currency,
          name: s.storeName,
          description: `Order ${number}`,
          prefill: { name: shippingAddress.fullName, email, contact: shippingAddress.phone },
        },
      });
    }
    if (method.id === "paypal") {
      const pp = await paypalCreateOrder({
        amountCents: totalCents,
        currency: s.currency,
        reference: number,
        returnUrl: `${base}/api/payments/paypal/return?order=${number}`,
        cancelUrl: `${orderUrl}?cancelled=1`,
        brandName: s.storeName,
      });
      await db.update(orders).set({ paymentRef: pp.id, paymentMeta: { paypalOrderId: pp.id } }).where(eq(orders.id, order.id));
      return Response.json({ orderNumber: number, redirect: pp.approveUrl });
    }
    if (method.id === "stripe") {
      const session = await stripeCreateCheckoutSession({
        items: lines.map((l) => ({ name: l.product.name, amountCents: l.product.priceCents, quantity: l.quantity, imageUrl: l.product.imageUrl })),
        shippingCents: ship.shippingCents,
        currency: s.currency,
        successUrl: `${base}/api/payments/stripe/return?order=${number}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${orderUrl}?cancelled=1`,
        reference: number,
        email,
      });
      await db.update(orders).set({ paymentRef: session.id, paymentMeta: { stripeSessionId: session.id } }).where(eq(orders.id, order.id));
      return Response.json({ orderNumber: number, redirect: session.url });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment initialisation failed";
    await db.update(orders).set({ paymentStatus: "failed", status: "pending", updatedAt: new Date() }).where(eq(orders.id, order.id));
    return Response.json({ error: message, orderNumber: number }, { status: 502 });
  }
  return Response.json({ error: "Unsupported payment method" }, { status: 400 });
}

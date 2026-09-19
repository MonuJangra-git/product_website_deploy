import { createHmac } from "crypto";

export type PaymentMethodId = "cod" | "razorpay" | "paypal" | "stripe";

export type PaymentMethodInfo = {
  id: PaymentMethodId;
  name: string;
  description: string;
  enabled: boolean;
  publicKey?: string; // safe to expose (e.g., Razorpay key id)
  mode?: string;
};

/** Gateways are enabled purely by presence of environment variables. */
export function getGatewayStatus(codEnabled: boolean): PaymentMethodInfo[] {
  const razorpayEnabled = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  const paypalEnabled = Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);
  return [
    {
      id: "razorpay",
      name: "Razorpay",
      description: "UPI, cards, netbanking & wallets",
      enabled: razorpayEnabled,
      publicKey: razorpayEnabled ? process.env.RAZORPAY_KEY_ID : undefined,
      mode: process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live") ? "live" : "test",
    },
    {
      id: "paypal",
      name: "PayPal",
      description: "Pay with PayPal balance or card",
      enabled: paypalEnabled,
      mode: (process.env.PAYPAL_MODE || "sandbox").toLowerCase(),
    },
    {
      id: "stripe",
      name: "Stripe",
      description: "Credit / debit cards",
      enabled: stripeEnabled,
      mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "live" : "test",
    },
    {
      id: "cod",
      name: "Cash on Delivery",
      description: "Pay in cash when your order arrives",
      enabled: codEnabled,
    },
  ];
}

export function getEnabledMethods(codEnabled: boolean) {
  return getGatewayStatus(codEnabled).filter((m) => m.enabled);
}

/* ---------------- Razorpay (REST, no SDK needed) ---------------- */

export async function razorpayCreateOrder(amountCents: number, currency: string, receipt: string) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountCents, currency, receipt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description || "Razorpay order creation failed");
  return data as { id: string; amount: number; currency: string };
}

export function razorpayVerifySignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

/* ---------------- PayPal (REST v2) ---------------- */

function paypalBase() {
  return (process.env.PAYPAL_MODE || "sandbox").toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function paypalToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description || "PayPal auth failed");
  return data.access_token as string;
}

export async function paypalCreateOrder(opts: {
  amountCents: number;
  currency: string;
  reference: string;
  returnUrl: string;
  cancelUrl: string;
  brandName: string;
}) {
  const token = await paypalToken();
  const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: opts.reference,
          amount: { currency_code: opts.currency, value: (opts.amountCents / 100).toFixed(2) },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: opts.brandName,
            user_action: "PAY_NOW",
            return_url: opts.returnUrl,
            cancel_url: opts.cancelUrl,
          },
        },
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.details?.[0]?.description || "PayPal order failed");
  const approve = (data.links as { rel: string; href: string }[]).find((l) => l.rel === "payer-action" || l.rel === "approve");
  return { id: data.id as string, approveUrl: approve?.href as string };
}

export async function paypalCaptureOrder(paypalOrderId: string) {
  const token = await paypalToken();
  const res = await fetch(`${paypalBase()}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "PayPal capture failed");
  return data as { id: string; status: string };
}

/* ---------------- Stripe Checkout (REST) ---------------- */

export async function stripeCreateCheckoutSession(opts: {
  items: { name: string; amountCents: number; quantity: number; imageUrl?: string }[];
  shippingCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  reference: string;
  email: string;
}) {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", opts.successUrl);
  params.set("cancel_url", opts.cancelUrl);
  params.set("client_reference_id", opts.reference);
  params.set("customer_email", opts.email);
  params.set("metadata[order]", opts.reference);
  const lines = [...opts.items];
  if (opts.shippingCents > 0) lines.push({ name: "Shipping", amountCents: opts.shippingCents, quantity: 1 });
  lines.forEach((it, i) => {
    params.set(`line_items[${i}][quantity]`, String(it.quantity));
    params.set(`line_items[${i}][price_data][currency]`, opts.currency.toLowerCase());
    params.set(`line_items[${i}][price_data][unit_amount]`, String(it.amountCents));
    params.set(`line_items[${i}][price_data][product_data][name]`, it.name);
    if (it.imageUrl && it.imageUrl.startsWith("http")) {
      params.set(`line_items[${i}][price_data][product_data][images][0]`, it.imageUrl);
    }
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Stripe session failed");
  return data as { id: string; url: string };
}

export async function stripeRetrieveSession(sessionId: string) {
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Stripe session lookup failed");
  return data as { id: string; payment_status: string; client_reference_id: string; payment_intent: string };
}

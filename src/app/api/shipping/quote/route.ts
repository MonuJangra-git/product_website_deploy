import { getSettings } from "@/lib/settings";
import { calcShipping, calcTax, type DeliveryMethod } from "@/lib/shipping";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const s = await getSettings();
  const country = String(b.country || "US");
  const subtotalCents = Number(b.subtotalCents || 0);
  const method = (b.deliveryMethod === "pickup" ? "pickup" : "standard") as DeliveryMethod;
  const ship = calcShipping(s, country, subtotalCents, method);
  const taxCents = calcTax(s, subtotalCents);
  return Response.json({
    zone: ship.zone ? { id: ship.zone.id, name: ship.zone.name, freeAboveCents: ship.zone.freeAboveCents } : null,
    shippingCents: ship.shippingCents,
    eta: ship.eta,
    taxCents,
    totalCents: subtotalCents + ship.shippingCents + taxCents,
    currency: s.currency,
  });
}

import { getSettings } from "@/lib/settings";
import { getGatewayStatus } from "@/lib/payments";
import { COUNTRIES } from "@/lib/shipping";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSettings();
  const methods = getGatewayStatus(s.codEnabled)
    .filter((m) => m.enabled)
    .map((m) => ({ id: m.id, name: m.name, description: m.description, publicKey: m.publicKey, mode: m.mode }));
  const allowed = s.allowedCountries.length ? COUNTRIES.filter((c) => s.allowedCountries.includes(c.code)) : COUNTRIES;
  return Response.json({
    storeName: s.storeName,
    currency: s.currency,
    taxPercent: s.taxPercent,
    pickupEnabled: s.pickupEnabled,
    paymentMethods: methods,
    shippingZones: s.shippingZones,
    countries: allowed,
  });
}

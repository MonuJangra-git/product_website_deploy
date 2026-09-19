import type { ShippingZone, StoreSettings } from "@/lib/settings";

export const COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "IN", name: "India" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "PK", name: "Pakistan" },
  { code: "BD", name: "Bangladesh" },
  { code: "PH", name: "Philippines" },
];

export function findZone(zones: ShippingZone[], country: string): ShippingZone | null {
  const code = country.toUpperCase();
  return zones.find((z) => z.countries.map((c) => c.toUpperCase()).includes(code)) ?? zones.find((z) => z.countries.includes("*")) ?? null;
}

export type DeliveryMethod = "standard" | "pickup";

export function calcShipping(
  s: StoreSettings,
  country: string,
  subtotalCents: number,
  method: DeliveryMethod,
): { zone: ShippingZone | null; shippingCents: number; eta: string } {
  if (method === "pickup") return { zone: null, shippingCents: 0, eta: "Ready in 1-2 days" };
  const zone = findZone(s.shippingZones, country);
  if (!zone) return { zone: null, shippingCents: 0, eta: "" };
  const free = zone.freeAboveCents !== null && subtotalCents >= zone.freeAboveCents;
  return { zone, shippingCents: free ? 0 : zone.rateCents, eta: `${zone.etaDays} business days` };
}

export function calcTax(s: StoreSettings, subtotalCents: number) {
  return Math.round((subtotalCents * (s.taxPercent || 0)) / 100);
}

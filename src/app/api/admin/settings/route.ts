import { requireAdmin } from "@/lib/auth";
import { getSettings, saveSettings, type StoreSettings } from "@/lib/settings";
import { getGatewayStatus } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function GET() {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const s = await getSettings();
  return Response.json({ settings: s, gateways: getGatewayStatus(s.codEnabled) });
}

export async function PUT(req: Request) {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const b = (await req.json().catch(() => ({}))) as Partial<StoreSettings>;
  const patch: Partial<StoreSettings> = {};
  if (typeof b.storeName === "string") patch.storeName = b.storeName.trim() || "My Store";
  if (typeof b.storeTagline === "string") patch.storeTagline = b.storeTagline;
  if (typeof b.siteUrl === "string") patch.siteUrl = b.siteUrl.trim().replace(/\/+$/, "");
  if (typeof b.currency === "string") patch.currency = b.currency.trim().toUpperCase().slice(0, 3) || "USD";
  if (typeof b.codEnabled === "boolean") patch.codEnabled = b.codEnabled;
  if (typeof b.pickupEnabled === "boolean") patch.pickupEnabled = b.pickupEnabled;
  if (typeof b.taxPercent === "number") patch.taxPercent = Math.max(0, b.taxPercent);
  if (typeof b.supportEmail === "string") patch.supportEmail = b.supportEmail;
  if (Array.isArray(b.shippingZones)) {
    patch.shippingZones = b.shippingZones
      .filter((z) => z && z.name)
      .map((z, i) => ({
        id: z.id || `zone-${i}`,
        name: String(z.name),
        countries: Array.isArray(z.countries) ? z.countries.map((c) => String(c).toUpperCase().trim()).filter(Boolean) : ["*"],
        rateCents: Math.max(0, Math.round(Number(z.rateCents) || 0)),
        freeAboveCents: z.freeAboveCents === null || z.freeAboveCents === undefined || Number.isNaN(Number(z.freeAboveCents)) ? null : Math.round(Number(z.freeAboveCents)),
        etaDays: String(z.etaDays || "3-7"),
      }));
  }
  if (Array.isArray(b.allowedCountries)) patch.allowedCountries = b.allowedCountries.map((c) => String(c).toUpperCase());
  const saved = await saveSettings(patch);
  return Response.json({ settings: saved, gateways: getGatewayStatus(saved.codEnabled) });
}

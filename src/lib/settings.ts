import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export type ShippingZone = {
  id: string;
  name: string;
  countries: string[]; // ISO country codes; "*" = rest of world
  rateCents: number;
  freeAboveCents: number | null;
  etaDays: string;
};

export type StoreSettings = {
  storeName: string;
  storeTagline: string;
  siteUrl: string; // e.g. http://192.168.1.20:3000 - used for payment callbacks
  currency: string;
  codEnabled: boolean;
  pickupEnabled: boolean;
  taxPercent: number;
  supportEmail: string;
  shippingZones: ShippingZone[];
  allowedCountries: string[]; // ISO codes (empty = all)
};

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: process.env.STORE_NAME || "NovaMart",
  storeTagline: "Quality products, delivered to your door.",
  siteUrl: process.env.SITE_URL || "",
  currency: process.env.STORE_CURRENCY || "USD",
  codEnabled: (process.env.ENABLE_COD ?? "true") !== "false",
  pickupEnabled: true,
  taxPercent: Number(process.env.TAX_PERCENT ?? 0),
  supportEmail: process.env.SUPPORT_EMAIL || "support@example.com",
  shippingZones: [
    { id: "domestic", name: "Domestic", countries: ["US"], rateCents: 599, freeAboveCents: 7500, etaDays: "2-4" },
    { id: "india", name: "India", countries: ["IN"], rateCents: 499, freeAboveCents: 4999, etaDays: "3-6" },
    { id: "europe", name: "Europe", countries: ["GB", "DE", "FR", "ES", "IT", "NL"], rateCents: 1499, freeAboveCents: 15000, etaDays: "5-8" },
    { id: "world", name: "Rest of World", countries: ["*"], rateCents: 2499, freeAboveCents: null, etaDays: "7-14" },
  ],
  allowedCountries: [],
};

const KEY = "store";

export async function getSettings(): Promise<StoreSettings> {
  try {
    const rows = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
    if (rows.length === 0) return DEFAULT_SETTINGS;
    const stored = rows[0].value as Partial<StoreSettings>;
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(next: Partial<StoreSettings>): Promise<StoreSettings> {
  const current = await getSettings();
  const merged: StoreSettings = { ...current, ...next };
  await db
    .insert(settings)
    .values({ key: KEY, value: merged, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: merged, updatedAt: new Date() } });
  return merged;
}

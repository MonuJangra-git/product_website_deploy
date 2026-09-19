import { headers } from "next/headers";
import { getSettings } from "@/lib/settings";

/**
 * Resolve the public base URL of this deployment.
 * Works on http:// and https://, private IPs (e.g. http://192.168.1.20:3000),
 * behind reverse proxies (x-forwarded-*), or via explicit SITE_URL / admin setting.
 */
export async function getBaseUrl(): Promise<string> {
  const s = await getSettings();
  if (s.siteUrl) return s.siteUrl.replace(/\/+$/, "");
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
    const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
    return `${proto}://${host}`;
  } catch {
    return "http://localhost:3000";
  }
}

export async function isSecureRequest(): Promise<boolean> {
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
    if (proto) return proto === "https";
    const s = await getSettings();
    const url = s.siteUrl || process.env.SITE_URL || "";
    return url.startsWith("https://");
  } catch {
    return false;
  }
}

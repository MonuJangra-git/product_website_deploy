import { db } from "@/db";
import { products, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export const SEED_PRODUCTS = [
  {
    slug: "sony-wh-1000xm5-wireless-headphones",
    name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
    brand: "Sony",
    category: "Audio",
    description:
      "Industry-leading noise cancellation with two processors controlling eight microphones. Up to 30 hours of battery life, crystal-clear hands-free calling, and an ultra-comfortable lightweight design. Includes carrying case and USB-C cable.",
    priceCents: 34999,
    compareAtCents: 39999,
    imageUrl: "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    stock: 25,
    featured: true,
  },
  {
    slug: "apple-airpods-pro-2nd-gen",
    name: "Apple AirPods Pro (2nd Generation) with MagSafe Case",
    brand: "Apple",
    category: "Audio",
    description:
      "Up to 2x more Active Noise Cancellation, Adaptive Transparency, Personalized Spatial Audio, and a MagSafe Charging Case (USB-C) with speaker and lanyard loop. Up to 6 hours of listening time on a single charge.",
    priceCents: 24900,
    compareAtCents: null,
    imageUrl: "https://images.pexels.com/photos/4526407/pexels-photo-4526407.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    stock: 40,
    featured: true,
  },
  {
    slug: "logitech-mx-master-3s-mouse",
    name: "Logitech MX Master 3S Wireless Performance Mouse",
    brand: "Logitech",
    category: "Computer Accessories",
    description:
      "8K DPI any-surface tracking, quiet clicks, MagSpeed electromagnetic scrolling at 1,000 lines per second, ergonomic sculpted design, USB-C quick charging and multi-device connectivity via Bluetooth or Logi Bolt.",
    priceCents: 9999,
    compareAtCents: 10999,
    imageUrl: "https://images.pexels.com/photos/12877898/pexels-photo-12877898.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    stock: 60,
    featured: false,
  },
  {
    slug: "kindle-paperwhite-16gb",
    name: "Kindle Paperwhite (16 GB) – 6.8\" Glare-Free Display",
    brand: "Amazon",
    category: "Electronics",
    description:
      "6.8\" glare-free display with adjustable warm light, up to 10 weeks of battery life, 20% faster page turns, waterproof (IPX8) design, and USB-C charging. Store thousands of books.",
    priceCents: 14999,
    compareAtCents: null,
    imageUrl: "/images/kindle-paperwhite.jpg",
    stock: 35,
    featured: true,
  },
  {
    slug: "stanley-quencher-h2-flowstate-tumbler-40oz",
    name: "Stanley Quencher H2.0 FlowState Tumbler 40 oz",
    brand: "Stanley",
    category: "Home & Kitchen",
    description:
      "Double-wall vacuum insulation keeps drinks cold for 11 hours and iced for 2 days. Advanced FlowState lid with three positions, comfort-grip handle, fits most car cup holders, made from 90% recycled stainless steel.",
    priceCents: 4500,
    compareAtCents: null,
    imageUrl: "/images/insulated-tumbler.jpg",
    stock: 80,
    featured: false,
  },
  {
    slug: "nike-air-force-1-07-white",
    name: "Nike Air Force 1 '07 – White",
    brand: "Nike",
    category: "Footwear",
    description:
      "The radiance lives on in the Nike Air Force 1 '07, the b-ball original that puts a fresh spin on what you know best: durably stitched leather overlays, clean finishes and the perfect amount of flash to make you shine.",
    priceCents: 11500,
    compareAtCents: null,
    imageUrl: "/images/white-sneakers.jpg",
    stock: 50,
    featured: true,
  },
];

let seededThisProcess = false;

/** Idempotent bootstrap: seeds products & admin account if missing. Safe to call often. */
export async function ensureSeeded() {
  if (seededThisProcess) return;
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
    if (Number(count) === 0) {
      await db.insert(products).values(SEED_PRODUCTS).onConflictDoNothing();
    }
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@store.local").toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, adminEmail)).limit(1);
    if (existing.length === 0) {
      await db
        .insert(users)
        .values({ name: "Store Admin", email: adminEmail, passwordHash: hashPassword(adminPassword), role: "admin" })
        .onConflictDoNothing();
    }
    seededThisProcess = true;
  } catch (err) {
    console.error("Seed failed", err);
  }
}

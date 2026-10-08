import crypto from "crypto";
import { db } from "@/db";
import { products, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export const SEED_PRODUCTS = [
  // ...unchanged
];

let seededThisProcess = false;

/**
 * Idempotent bootstrap: seeds demo products (non-prod only) and ensures an
 * admin account exists if explicitly configured via env vars.
 * Safe to call often.
 */
export async function ensureSeeded() {
  if (seededThisProcess) return;

  try {
    await seedProducts();
    await seedAdmin();
    seededThisProcess = true;
  } catch (err) {
    console.error("Seed failed", err);
  }
}

async function seedProducts() {
  // Never auto-seed demo catalog data in production.
  if (process.env.NODE_ENV === "production") return;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products);

  if (Number(count) === 0) {
    await db.insert(products).values(SEED_PRODUCTS).onConflictDoNothing();
  }
}

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  // No admin email configured -> nothing to do. Don't silently create one.
  if (!adminEmail) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[seed] ADMIN_EMAIL is not set — skipping admin account bootstrap."
      );
    }
    return;
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existing.length > 0) return;

  let adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    if (process.env.NODE_ENV === "production") {
      // Never invent a known/weak default password in production.
      throw new Error(
        "ADMIN_PASSWORD must be set in production to bootstrap the admin account."
      );
    }
    // Dev/test convenience only: generate a random password and print it once.
    adminPassword = crypto.randomBytes(12).toString("base64url");
    console.warn(
      `[seed] ADMIN_PASSWORD not set. Generated a temporary admin password for ${adminEmail}: ${adminPassword}`
    );
  }

  await db
    .insert(users)
    .values({
      name: "Store Admin",
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: "admin",
    })
    .onConflictDoNothing();
}
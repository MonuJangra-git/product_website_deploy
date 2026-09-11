import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isSecureRequest } from "@/lib/url";

const COOKIE = "nm_session";
const SESSION_DAYS = 30;

function secret(): string {
  return process.env.SESSION_SECRET || process.env.DATABASE_URL || "dev-secret-change-me";
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: number): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseSessionToken(token: string | undefined): number | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid: number; exp: number };
    if (data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: number) {
  const store = await cookies();
  // `secure` only when served over HTTPS so login works on plain http:// and private IPs too.
  const secure = await isSecureRequest();
  store.set(COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const uid = parseSessionToken(store.get(COOKIE)?.value);
  if (!uid) return null;
  const rows = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  return rows[0] ?? null;
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("UNAUTHORIZED");
  return user;
}

export function publicUser(u: User) {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

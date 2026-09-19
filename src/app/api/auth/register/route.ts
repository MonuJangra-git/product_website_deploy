import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, publicUser, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!name || !email || password.length < 6) {
    return Response.json({ error: "Name, valid email and a password of at least 6 characters are required." }, { status: 400 });
  }
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return Response.json({ error: "An account with this email already exists." }, { status: 409 });
  const [user] = await db.insert(users).values({ name, email, passwordHash: hashPassword(password) }).returning();
  await setSessionCookie(user.id);
  return Response.json({ user: publicUser(user) });
}

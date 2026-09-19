import { db } from "@/db";
import { addresses } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ addresses: [] });
  const list = await db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  return Response.json({ addresses: list });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Login required" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!b.fullName || !b.line1 || !b.city || !b.country) return Response.json({ error: "Missing required fields" }, { status: 400 });
  if (b.isDefault) await db.update(addresses).set({ isDefault: false }).where(and(eq(addresses.userId, user.id)));
  const [row] = await db
    .insert(addresses)
    .values({
      userId: user.id,
      label: b.label || "Home",
      fullName: b.fullName,
      phone: b.phone || "",
      line1: b.line1,
      line2: b.line2 || "",
      city: b.city,
      state: b.state || "",
      postalCode: b.postalCode || "",
      country: String(b.country).toUpperCase(),
      lat: b.lat ?? null,
      lng: b.lng ?? null,
      isDefault: Boolean(b.isDefault),
    })
    .returning();
  return Response.json({ address: row });
}

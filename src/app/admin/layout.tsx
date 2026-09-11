import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Admin access required</h1>
        <p className="mt-2 text-slate-600">Your account ({user.email}) is not an administrator. Log in with the admin account.</p>
        <Link href="/login?next=/admin" className="mt-6 inline-block rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">Switch account</Link>
      </main>
    );
  }
  const nav = [
    ["/admin", "Orders"],
    ["/admin/products", "Products"],
    ["/admin/settings", "Settings"],
  ];
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <h1 className="mr-4 text-2xl font-bold">Store admin</h1>
        {nav.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold hover:border-indigo-500 hover:text-indigo-700">
            {label}
          </Link>
        ))}
      </div>
      {children}
    </main>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { Header } from "@/components/header";
import { getSettings } from "@/lib/settings";
import { getCurrentUser, publicUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: { default: s.storeName, template: `%s · ${s.storeName}` }, description: s.storeTagline };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  await ensureSeeded();
  const [s, user] = await Promise.all([getSettings(), getCurrentUser()]);
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <CartProvider>
          <Header storeName={s.storeName} user={user ? publicUser(user) : null} />
          <div className="min-h-[70vh]">{children}</div>
          <footer className="mt-16 border-t border-slate-200 bg-white">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
              <div>
                <p className="text-lg font-bold">{s.storeName}</p>
                <p className="mt-2 text-sm text-slate-600">{s.storeTagline}</p>
              </div>
              <div className="text-sm">
                <p className="font-semibold">Shop</p>
                <ul className="mt-2 space-y-1 text-slate-600">
                  <li><Link href="/products" className="hover:text-indigo-600">All products</Link></li>
                  <li><Link href="/cart" className="hover:text-indigo-600">Cart</Link></li>
                  <li><Link href="/account" className="hover:text-indigo-600">My account</Link></li>
                </ul>
              </div>
              <div className="text-sm">
                <p className="font-semibold">Support</p>
                <ul className="mt-2 space-y-1 text-slate-600">
                  <li>{s.supportEmail}</li>
                  <li><Link href="/track" className="hover:text-indigo-600">Track an order</Link></li>
                  <li><Link href="/admin" className="hover:text-indigo-600">Store admin</Link></li>
                </ul>
              </div>
            </div>
            <p className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
              © {new Date().getFullYear()} {s.storeName}. All rights reserved.
            </p>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}

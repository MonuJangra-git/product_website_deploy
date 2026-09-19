"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SessionUser = { id: number; name: string; email: string; role: string } | null;

export function Header({ storeName, user }: { storeName: string; user: SessionUser }) {
  const { count, hydrated } = useCart();
  const router = useRouter();
  const [q, setQ] = useState("");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">N</span>
          <span className="hidden sm:inline">{storeName}</span>
        </Link>
        <form
          className="ml-2 hidden flex-1 md:flex"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/products?q=${encodeURIComponent(q)}`);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className="w-full max-w-lg rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </form>
        <nav className="ml-auto flex items-center gap-1 text-sm font-medium sm:gap-3">
          <Link href="/products" className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100">
            Shop
          </Link>
          {user ? (
            <>
              <Link href="/account" className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100">
                {user.name.split(" ")[0]}
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="rounded-md px-3 py-2 text-indigo-700 hover:bg-indigo-50">
                  Admin
                </Link>
              )}
              <button onClick={logout} className="rounded-md px-3 py-2 text-slate-500 hover:bg-slate-100">
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100">
              Login
            </Link>
          )}
          <Link href="/cart" className="relative rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100">
            <span className="inline-flex items-center gap-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              Cart
            </span>
            {hydrated && count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-indigo-600 px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

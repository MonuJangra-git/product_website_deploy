"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/account";
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error || "Failed"); return; }
    router.push(d.user.role === "admin" && next === "/account" ? "/admin" : next);
    router.refresh();
  }

  const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "register" && (
            <label className="block text-sm font-medium">Full name
              <input className={input} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
          )}
          <label className="block text-sm font-medium">Email
            <input className={input} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="block text-sm font-medium">Password
            <input className={input} type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
          <button disabled={busy} className="w-full rounded-full bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          {mode === "login" ? (
            <>New here? <Link className="font-semibold text-indigo-700" href={`/register?next=${encodeURIComponent(next)}`}>Create an account</Link></>
          ) : (
            <>Already have an account? <Link className="font-semibold text-indigo-700" href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link></>
          )}
        </p>
        {mode === "login" && (
          <div className="mt-6 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Test admin account</p>
            <p>Email: <code>admin@store.local</code> · Password: <code>admin123</code></p>
            <p className="mt-1">Change via ADMIN_EMAIL / ADMIN_PASSWORD env vars before going live.</p>
          </div>
        )}
      </div>
    </main>
  );
}

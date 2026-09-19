"use client";

import { useEffect, useState } from "react";
import type { Address } from "@/db/schema";

const empty = { label: "Home", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "US", isDefault: false };

export function AddressManager({ initial }: { initial: Address[] }) {
  const [list, setList] = useState<Address[]>(initial);
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/store").then((r) => r.json()).then((d) => setCountries(d.countries || []));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/addresses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json();
    if (!res.ok) { setError(d.error || "Failed"); return; }
    setList((l) => [d.address, ...l.map((a) => (form.isDefault ? { ...a, isDefault: false } : a))]);
    setForm(empty);
    setOpen(false);
  }

  async function remove(id: number) {
    await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    setList((l) => l.filter((a) => a.id !== id));
  }

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return (
    <div className="space-y-3">
      {list.map((a) => (
        <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
          <div className="flex items-start justify-between">
            <p className="font-semibold">{a.label} {a.isDefault && <span className="ml-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">DEFAULT</span>}</p>
            <button onClick={() => remove(a.id)} className="text-xs text-rose-600 hover:underline">Remove</button>
          </div>
          <p>{a.fullName} · {a.phone}</p>
          <p className="text-slate-600">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.state} {a.postalCode}, {a.country}</p>
        </div>
      ))}
      {open ? (
        <form onSubmit={save} className="grid gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 sm:grid-cols-2">
          <input className={input} placeholder="Label (Home, Office)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <input className={input} placeholder="Full name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <input className={input} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className={input} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <input className={`${input} sm:col-span-2`} placeholder="Address line 1" required value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
          <input className={`${input} sm:col-span-2`} placeholder="Address line 2" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
          <input className={input} placeholder="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input className={input} placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <input className={input} placeholder="Postal code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Set as default</label>
          {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Save address</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="w-full rounded-2xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600 hover:border-indigo-400 hover:text-indigo-700">
          + Add new address
        </button>
      )}
    </div>
  );
}

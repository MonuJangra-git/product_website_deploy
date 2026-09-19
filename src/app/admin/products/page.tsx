"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/db/schema";
import { formatMoney } from "@/lib/money";

type Form = {
  id?: number; name: string; brand: string; category: string; description: string; price: string; compareAt: string; imageUrl: string; stock: string; featured: boolean; active: boolean;
};
const empty: Form = { name: "", brand: "", category: "General", description: "", price: "", compareAt: "", imageUrl: "", stock: "10", featured: false, active: true };

export default function AdminProducts() {
  const [list, setList] = useState<Product[]>([]);
  const [form, setForm] = useState<Form>(empty);
  const [currency, setCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const d = await fetch("/api/admin/products").then((r) => r.json());
    setList(d.products || []);
  }
  useEffect(() => {
    load();
    fetch("/api/store").then((r) => r.json()).then((d) => setCurrency(d.currency));
  }, []);

  function edit(p: Product) {
    setForm({ id: p.id, name: p.name, brand: p.brand, category: p.category, description: p.description, price: (p.priceCents / 100).toFixed(2), compareAt: p.compareAtCents ? (p.compareAtCents / 100).toFixed(2) : "", imageUrl: p.imageUrl, stock: String(p.stock), featured: p.featured, active: p.active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      name: form.name, brand: form.brand, category: form.category, description: form.description,
      priceCents: Math.round(parseFloat(form.price || "0") * 100),
      compareAtCents: form.compareAt ? Math.round(parseFloat(form.compareAt) * 100) : null,
      imageUrl: form.imageUrl, stock: Number(form.stock), featured: form.featured, active: form.active,
    };
    const res = await fetch(form.id ? `/api/admin/products/${form.id}` : "/api/admin/products", {
      method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error || "Failed"); return; }
    setForm(empty);
    load();
  }

  async function archive(id: number) {
    if (!confirm("Hide this product from the store?")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    load();
  }

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={save} className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold">{form.id ? "Edit product" : "Add product"}</h2>
        <input className={input} placeholder="Product name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={input} placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <input className={input} placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        <textarea className={input} rows={4} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid grid-cols-3 gap-2">
          <input className={input} type="number" step="0.01" min="0" placeholder={`Price (${currency})`} required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input className={input} type="number" step="0.01" min="0" placeholder="Compare-at" value={form.compareAt} onChange={(e) => setForm({ ...form, compareAt: e.target.value })} />
          <input className={input} type="number" min="0" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        </div>
        <input className={input} placeholder="Image URL (https://… or /images/…)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        {form.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.imageUrl} alt="" className="h-28 w-28 rounded-lg object-cover" />
        )}
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button disabled={busy} className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{form.id ? "Save changes" : "Create product"}</button>
          {form.id && <button type="button" onClick={() => setForm(empty)} className="rounded-full border border-slate-300 px-4 py-2 text-sm">Cancel</button>}
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Flags</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((p) => (
              <tr key={p.id} className={p.active ? "" : "opacity-50"}>
                <td className="flex items-center gap-3 px-4 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.brand} · {p.category}</p>
                  </div>
                </td>
                <td className="px-4 py-3">{formatMoney(p.priceCents, currency)}</td>
                <td className={`px-4 py-3 ${p.stock <= 5 ? "font-semibold text-rose-600" : ""}`}>{p.stock}</td>
                <td className="px-4 py-3 text-xs">{p.featured && "⭐ "}{p.active ? "Active" : "Hidden"}</td>
                <td className="px-4 py-3 text-right text-xs">
                  <button onClick={() => edit(p)} className="mr-3 font-semibold text-indigo-700">Edit</button>
                  {p.active && <button onClick={() => archive(p.id)} className="text-rose-600">Hide</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

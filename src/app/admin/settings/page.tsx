"use client";

import { useEffect, useState } from "react";
import type { ShippingZone, StoreSettings } from "@/lib/settings";

type Gateway = { id: string; name: string; enabled: boolean; mode?: string };

export default function AdminSettings() {
  const [s, setS] = useState<StoreSettings | null>(null);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => { setS(d.settings); setGateways(d.gateways || []); });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(d.error || "Failed to save"); return; }
    setS(d.settings);
    setGateways(d.gateways);
    setMsg("Settings saved ✓");
  }

  function setZone(i: number, patch: Partial<ShippingZone>) {
    if (!s) return;
    const zones = s.shippingZones.map((z, idx) => (idx === i ? { ...z, ...patch } : z));
    setS({ ...s, shippingZones: zones });
  }

  if (!s) return <p className="text-slate-500">Loading…</p>;
  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold">Store</h2>
        <label className="block text-sm font-medium">Store name<input className={input} value={s.storeName} onChange={(e) => setS({ ...s, storeName: e.target.value })} /></label>
        <label className="block text-sm font-medium">Tagline<input className={input} value={s.storeTagline} onChange={(e) => setS({ ...s, storeTagline: e.target.value })} /></label>
        <label className="block text-sm font-medium">Support email<input className={input} value={s.supportEmail} onChange={(e) => setS({ ...s, supportEmail: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">Currency (ISO)<input className={input} maxLength={3} value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value.toUpperCase() })} /></label>
          <label className="block text-sm font-medium">Tax %<input className={input} type="number" step="0.01" min="0" value={s.taxPercent} onChange={(e) => setS({ ...s, taxPercent: Number(e.target.value) })} /></label>
        </div>
        <label className="block text-sm font-medium">
          Public store URL / private IP
          <input className={input} placeholder={origin || "http://192.168.1.20:3000"} value={s.siteUrl} onChange={(e) => setS({ ...s, siteUrl: e.target.value })} />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Used for payment return URLs. Works with <code>http://</code> or <code>https://</code>, a domain, LAN/private IP (e.g. <code>http://10.0.0.5:3000</code>) or public IP. Leave empty to auto-detect from the request ({origin || "…"}).
          </span>
        </label>
        <button type="button" onClick={() => setS({ ...s, siteUrl: origin })} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-slate-50">Use current address ({origin})</button>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold">Payments</h2>
        <p className="text-sm text-slate-600">Online gateways switch on automatically when their environment variables are set (no code changes needed):</p>
        <ul className="space-y-2 text-sm">
          {gateways.map((g) => (
            <li key={g.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span className="font-semibold">{g.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${g.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{g.enabled ? `ON${g.mode ? ` · ${g.mode}` : ""}` : "OFF"}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-800">Environment variables</p>
          <pre className="mt-1 whitespace-pre-wrap font-mono">{`RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_MODE=sandbox|live
STRIPE_SECRET_KEY=sk_test_xxx`}</pre>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.codEnabled} onChange={(e) => setS({ ...s, codEnabled: e.target.checked })} /> Enable Cash on Delivery</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.pickupEnabled} onChange={(e) => setS({ ...s, pickupEnabled: e.target.checked })} /> Enable store pickup</label>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Delivery zones</h2>
          <button type="button" onClick={() => setS({ ...s, shippingZones: [...s.shippingZones, { id: `zone-${Date.now()}`, name: "New zone", countries: [], rateCents: 0, freeAboveCents: null, etaDays: "3-7" }] })} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold">+ Add zone</button>
        </div>
        <p className="text-xs text-slate-500">Countries as ISO codes separated by commas (e.g. <code>US, CA</code>). Use <code>*</code> for “rest of world”. Amounts in minor units (cents/paise).</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Zone</th><th className="p-2">Countries</th><th className="p-2">Rate</th><th className="p-2">Free above</th><th className="p-2">ETA (days)</th><th></th></tr></thead>
            <tbody>
              {s.shippingZones.map((z, i) => (
                <tr key={z.id}>
                  <td className="p-2"><input className={input} value={z.name} onChange={(e) => setZone(i, { name: e.target.value })} /></td>
                  <td className="p-2"><input className={input} value={z.countries.join(", ")} onChange={(e) => setZone(i, { countries: e.target.value.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean) })} /></td>
                  <td className="p-2"><input className={input} type="number" min="0" value={z.rateCents} onChange={(e) => setZone(i, { rateCents: Number(e.target.value) })} /></td>
                  <td className="p-2"><input className={input} type="number" min="0" placeholder="never" value={z.freeAboveCents ?? ""} onChange={(e) => setZone(i, { freeAboveCents: e.target.value === "" ? null : Number(e.target.value) })} /></td>
                  <td className="p-2"><input className={input} value={z.etaDays} onChange={(e) => setZone(i, { etaDays: e.target.value })} /></td>
                  <td className="p-2"><button type="button" onClick={() => setS({ ...s, shippingZones: s.shippingZones.filter((_, idx) => idx !== i) })} className="text-xs text-rose-600">Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-center gap-4 lg:col-span-2">
        <button disabled={busy} className="rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save settings"}</button>
        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </div>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatMoney } from "@/lib/money";

type StoreInfo = {
  storeName: string;
  currency: string;
  taxPercent: number;
  pickupEnabled: boolean;
  paymentMethods: { id: string; name: string; description: string; publicKey?: string; mode?: string }[];
  countries: { code: string; name: string }[];
};
type SavedAddress = {
  id: number; label: string; fullName: string; phone: string; line1: string; line2: string; city: string; state: string; postalCode: string; country: string; lat: number | null; lng: number | null;
};
type Quote = { zone: { name: string; freeAboveCents: number | null } | null; shippingCents: number; eta: string; taxCents: number; totalCents: number };

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void };
  }
}

const emptyAddress = { fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "US", lat: null as number | null, lng: null as number | null };

export default function CheckoutPage() {
  const { items, subtotalCents, hydrated, clear } = useCart();
  const router = useRouter();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [selectedSaved, setSelectedSaved] = useState<number | "new">("new");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState(emptyAddress);
  const [deliveryMethod, setDeliveryMethod] = useState<"standard" | "pickup">("standard");
  const [payment, setPayment] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/store").then((r) => r.json()).then((d: StoreInfo) => {
      setStore(d);
      if (d.paymentMethods.length) setPayment(d.paymentMethods[0].id);
    });
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.user) { setUser(d.user); setEmail(d.user.email); setAddress((a) => ({ ...a, fullName: d.user.name })); }
    });
    fetch("/api/addresses").then((r) => r.json()).then((d) => {
      setSaved(d.addresses || []);
      if (d.addresses?.length) applySaved(d.addresses[0]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applySaved(a: SavedAddress) {
    setSelectedSaved(a.id);
    setAddress({ fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2, city: a.city, state: a.state, postalCode: a.postalCode, country: a.country, lat: a.lat, lng: a.lng });
    setSaveAddress(false);
  }

  const refreshQuote = useCallback(() => {
    if (!hydrated) return;
    fetch("/api/shipping/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: address.country, subtotalCents, deliveryMethod }),
    }).then((r) => r.json()).then(setQuote).catch(() => {});
  }, [address.country, subtotalCents, deliveryMethod, hydrated]);

  useEffect(() => { refreshQuote(); }, [refreshQuote]);

  const currency = store?.currency || "USD";

  function useMyLocation() {
    if (!navigator.geolocation) { setError("Geolocation is not supported by this browser."); return; }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`, { headers: { Accept: "application/json" } });
          const d = await res.json();
          const ad = d.address || {};
          setAddress((a) => ({
            ...a,
            lat: latitude,
            lng: longitude,
            line1: a.line1 || [ad.house_number, ad.road].filter(Boolean).join(" "),
            city: ad.city || ad.town || ad.village || ad.county || a.city,
            state: ad.state || a.state,
            postalCode: ad.postcode || a.postalCode,
            country: (ad.country_code || a.country).toUpperCase(),
          }));
        } catch {
          setAddress((a) => ({ ...a, lat: latitude, lng: longitude }));
        } finally {
          setLocating(false);
          setSelectedSaved("new");
        }
      },
      (err) => { setLocating(false); setError(err.message || "Unable to get your location. Note: browsers only allow GPS on https:// or localhost."); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const canSubmit = useMemo(() => {
    if (!items.length || !payment || !email.includes("@")) return false;
    if (deliveryMethod === "pickup") return Boolean(address.fullName);
    return Boolean(address.fullName && address.line1 && address.city && address.country);
  }, [items.length, payment, email, deliveryMethod, address]);

  async function loadRazorpay(): Promise<boolean> {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }

  async function placeOrder() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          email, address, deliveryMethod, paymentMethod: payment, notes, saveAddress: saveAddress && selectedSaved === "new",
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not place order");

      if (d.razorpay) {
        const ok = await loadRazorpay();
        if (!ok || !window.Razorpay) throw new Error("Could not load Razorpay checkout");
        const rzp = new window.Razorpay({
          ...d.razorpay,
          order_id: d.razorpay.orderId,
          handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            const v = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderNumber: d.orderNumber, ...resp }),
            });
            const vd = await v.json();
            if (v.ok) { clear(); router.push(vd.redirect); } else { setError(vd.error || "Payment verification failed"); setSubmitting(false); }
          },
          modal: { ondismiss: () => { setSubmitting(false); setError("Payment cancelled. Your order is saved as pending."); } },
          theme: { color: "#4f46e5" },
        });
        rzp.open();
        return;
      }
      if (d.redirect) {
        clear();
        if (d.redirect.startsWith("http")) window.location.href = d.redirect;
        else router.push(d.redirect);
        return;
      }
      throw new Error("Unexpected response");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (!hydrated || !store) return <main className="mx-auto max-w-6xl px-4 py-12 text-slate-500">Loading checkout…</main>;
  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link href="/products" className="mt-6 inline-block rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white">Browse products</Link>
      </main>
    );
  }

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold">Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Contact */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">1. Contact</h2>
            {!user && (
              <p className="mb-3 text-sm text-slate-600">
                Have an account? <Link href="/login?next=/checkout" className="font-semibold text-indigo-700">Log in</Link> to use saved addresses.
              </p>
            )}
            <label className="block text-sm font-medium">Email
              <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
          </section>

          {/* Delivery */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">2. Delivery location</h2>
            <div className="mb-4 flex gap-2">
              <button onClick={() => setDeliveryMethod("standard")} className={`rounded-full px-4 py-2 text-sm font-semibold ${deliveryMethod === "standard" ? "bg-slate-900 text-white" : "border border-slate-300"}`}>🚚 Ship to address</button>
              {store.pickupEnabled && (
                <button onClick={() => setDeliveryMethod("pickup")} className={`rounded-full px-4 py-2 text-sm font-semibold ${deliveryMethod === "pickup" ? "bg-slate-900 text-white" : "border border-slate-300"}`}>🏬 Store pickup (free)</button>
              )}
            </div>

            {saved.length > 0 && deliveryMethod === "standard" && (
              <div className="mb-4 grid gap-2 sm:grid-cols-2">
                {saved.map((a) => (
                  <button key={a.id} onClick={() => applySaved(a)} className={`rounded-xl border p-3 text-left text-sm ${selectedSaved === a.id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-slate-400"}`}>
                    <p className="font-semibold">{a.label} · {a.fullName}</p>
                    <p className="text-slate-600">{a.line1}, {a.city} {a.postalCode}, {a.country}</p>
                  </button>
                ))}
                <button onClick={() => { setSelectedSaved("new"); setAddress({ ...emptyAddress, fullName: user?.name || "" }); setSaveAddress(true); }} className={`rounded-xl border border-dashed p-3 text-left text-sm ${selectedSaved === "new" ? "border-indigo-600 bg-indigo-50" : "border-slate-300"}`}>
                  + Use a new address
                </button>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">Full name
                <input className={input} value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} />
              </label>
              <label className="text-sm font-medium">Phone
                <input className={input} value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} placeholder="+1 555 000 0000" />
              </label>
              {deliveryMethod === "standard" && (
                <>
                  <label className="text-sm font-medium sm:col-span-2">Address line 1
                    <input className={input} value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="Street, house no." />
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">Address line 2 (optional)
                    <input className={input} value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="Apartment, landmark" />
                  </label>
                  <label className="text-sm font-medium">City
                    <input className={input} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                  </label>
                  <label className="text-sm font-medium">State / Region
                    <input className={input} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
                  </label>
                  <label className="text-sm font-medium">Postal code
                    <input className={input} value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} />
                  </label>
                  <label className="text-sm font-medium">Country
                    <select className={input} value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })}>
                      {store.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </label>
                  <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                    <button type="button" onClick={useMyLocation} disabled={locating} className="rounded-full border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                      {locating ? "Locating…" : "📍 Use my current location"}
                    </button>
                    {address.lat && address.lng && (
                      <span className="text-xs text-slate-500">
                        Pinned: {address.lat.toFixed(5)}, {address.lng.toFixed(5)} ·{" "}
                        <a className="underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${address.lat}&mlon=${address.lng}#map=16/${address.lat}/${address.lng}`}>view map</a>
                      </span>
                    )}
                  </div>
                  {user && selectedSaved === "new" && (
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} /> Save this address to my account
                    </label>
                  )}
                </>
              )}
            </div>
            {quote && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
                {deliveryMethod === "pickup" ? (
                  <p>🏬 Pick up from store · <span className="font-semibold">{quote.eta}</span></p>
                ) : quote.zone ? (
                  <p>
                    Zone: <span className="font-semibold">{quote.zone.name}</span> · Shipping: <span className="font-semibold">{quote.shippingCents === 0 ? "FREE" : formatMoney(quote.shippingCents, currency)}</span> · ETA {quote.eta}
                    {quote.zone.freeAboveCents && quote.shippingCents > 0 && (
                      <span className="text-slate-500"> (free above {formatMoney(quote.zone.freeAboveCents, currency)})</span>
                    )}
                  </p>
                ) : (
                  <p className="text-rose-600">We don&apos;t ship to this country yet.</p>
                )}
              </div>
            )}
          </section>

          {/* Payment */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">3. Payment</h2>
            {store.paymentMethods.length === 0 ? (
              <p className="text-sm text-rose-600">No payment methods configured. Set RAZORPAY_*, PAYPAL_*, STRIPE_* env vars or enable Cash on Delivery in admin settings.</p>
            ) : (
              <div className="grid gap-2">
                {store.paymentMethods.map((m) => (
                  <label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${payment === m.id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-slate-400"}`}>
                    <input type="radio" name="pm" checked={payment === m.id} onChange={() => setPayment(m.id)} />
                    <div className="flex-1">
                      <p className="font-semibold">{m.name} {m.mode && m.mode !== "live" && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">{m.mode}</span>}</p>
                      <p className="text-xs text-slate-600">{m.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <label className="mt-4 block text-sm font-medium">Order notes (optional)
              <textarea className={input} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions…" />
            </label>
          </section>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-6 lg:sticky lg:top-20">
          <h2 className="text-lg font-bold">Order summary</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {items.map((it) => (
              <li key={it.productId} className="flex items-center gap-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <span className="flex-1 line-clamp-2">{it.name} × {it.quantity}</span>
                <span className="font-semibold">{formatMoney(it.priceCents * it.quantity, currency)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-slate-200 pt-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(subtotalCents, currency)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{quote ? (quote.shippingCents === 0 ? "Free" : formatMoney(quote.shippingCents, currency)) : "—"}</span></div>
            {quote && quote.taxCents > 0 && <div className="flex justify-between"><span>Tax ({store.taxPercent}%)</span><span>{formatMoney(quote.taxCents, currency)}</span></div>}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><span>Total</span><span>{formatMoney(quote?.totalCents ?? subtotalCents, currency)}</span></div>
          </div>
          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <button onClick={placeOrder} disabled={!canSubmit || submitting || (deliveryMethod === "standard" && quote?.zone === null)} className="w-full rounded-full bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            {submitting ? "Processing…" : payment === "cod" ? "Place order" : `Pay ${formatMoney(quote?.totalCents ?? subtotalCents, currency)}`}
          </button>
          <p className="text-center text-xs text-slate-500">🔒 Prices are re-validated on the server before payment.</p>
        </aside>
      </div>
    </main>
  );
}

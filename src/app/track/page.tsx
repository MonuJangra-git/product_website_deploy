import { redirect } from "next/navigation";

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  if (order) redirect(`/orders/${order.trim().toUpperCase()}`);
  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-2xl font-bold">Track your order</h1>
      <p className="mt-1 text-sm text-slate-600">Enter the order number from your confirmation (e.g. NM-20250101-AB12CD).</p>
      <form className="mt-6 flex gap-2">
        <input name="order" required placeholder="NM-…" className="flex-1 rounded-lg border border-slate-300 px-3 py-2" />
        <button className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Track</button>
      </form>
    </main>
  );
}

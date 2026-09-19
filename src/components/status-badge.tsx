const COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  placed: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${COLORS[status] || "bg-slate-100 text-slate-700"}`}>{status}</span>
  );
}

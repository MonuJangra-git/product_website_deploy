"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string;
  quantity: number;
  stock: number;
};

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (productId: number) => void;
  setQty: (productId: number, qty: number) => void;
  clear: () => void;
  count: number;
  subtotalCents: number;
  hydrated: boolean;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "nm_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add = useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.productId === item.productId);
      if (existing) {
        return prev.map((p) =>
          p.productId === item.productId ? { ...p, quantity: Math.min(p.quantity + qty, item.stock || 99) } : p,
        );
      }
      return [...prev, { ...item, quantity: Math.min(qty, item.stock || 99) }];
    });
  }, []);

  const remove = useCallback((productId: number) => setItems((prev) => prev.filter((p) => p.productId !== productId)), []);
  const setQty = useCallback((productId: number, qty: number) => {
    setItems((prev) =>
      qty <= 0 ? prev.filter((p) => p.productId !== productId) : prev.map((p) => (p.productId === productId ? { ...p, quantity: qty } : p)),
    );
  }, []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartCtx>(() => {
    const count = items.reduce((a, b) => a + b.quantity, 0);
    const subtotalCents = items.reduce((a, b) => a + b.quantity * b.priceCents, 0);
    return { items, add, remove, setQty, clear, count, subtotalCents, hydrated };
  }, [items, add, remove, setQty, clear, hydrated]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

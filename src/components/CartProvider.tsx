"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartAddon = { id: number; nameAr: string; price: number };

export type CartLine = {
  key: string;
  itemId: number;
  nameAr: string;
  emoji: string;
  sizeId: number | null;
  sizeName: string | null;
  unitPrice: number;
  addons: CartAddon[];
  notes: string;
  quantity: number;
};

type CartState = {
  restaurantId: number | null;
  restaurantName: string;
  lines: CartLine[];
};

type Ctx = {
  cart: CartState;
  addLine: (line: Omit<CartLine, "key"> & { restaurantId: number; restaurantName: string }) => void;
  setQty: (key: string, qty: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartCtx = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>({
    restaurantId: null,
    restaurantName: "",
    lines: [],
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("luqma_cart");
      if (raw) setCart(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("luqma_cart", JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);

  const addLine: Ctx["addLine"] = useCallback((line) => {
    setCart((prev) => {
      if (prev.restaurantId && prev.restaurantId !== line.restaurantId) {
        return {
          restaurantId: line.restaurantId,
          restaurantName: line.restaurantName,
          lines: [normalize(line)],
        };
      }
      const existing = prev.lines.find((l) => l.key === keyOf(line));
      if (existing) {
        return {
          ...prev,
          lines: prev.lines.map((l) =>
            l.key === existing.key
              ? { ...l, quantity: Math.min(20, l.quantity + line.quantity) }
              : l,
          ),
        };
      }
      return {
        restaurantId: line.restaurantId,
        restaurantName: line.restaurantName,
        lines: [...prev.lines, normalize(line)],
      };
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setCart((prev) => ({
      ...prev,
      lines:
        qty <= 0
          ? prev.lines.filter((l) => l.key !== key)
          : prev.lines.map((l) =>
              l.key === key ? { ...l, quantity: Math.min(20, qty) } : l,
            ),
    }));
  }, []);

  const removeLine = useCallback((key: string) => {
    setCart((prev) => ({
      ...prev,
      lines: prev.lines.filter((l) => l.key !== key),
    }));
  }, []);

  const clear = useCallback(() => {
    setCart({ restaurantId: null, restaurantName: "", lines: [] });
  }, []);

  const value = useMemo<Ctx>(() => {
    const count = cart.lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = cart.lines.reduce(
      (s, l) =>
        s +
        (l.unitPrice + l.addons.reduce((a, b) => a + b.price, 0)) * l.quantity,
      0,
    );
    return { cart, addLine, setQty, removeLine, clear, count, subtotal };
  }, [cart, addLine, setQty, removeLine, clear]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

function keyOf(l: Omit<CartLine, "key">) {
  return `${l.itemId}-${l.sizeId ?? 0}-${(l.addons ?? []).map((a) => a.id).sort().join(",")}-${l.notes}`;
}

function normalize(l: Omit<CartLine, "key">): CartLine {
  return { ...l, key: keyOf(l) };
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}

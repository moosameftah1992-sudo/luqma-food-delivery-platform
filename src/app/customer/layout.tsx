import type { ReactNode } from "react";
import { CartProvider } from "@/components/CartProvider";
import { ToastProvider } from "@/components/ToastProvider";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CartProvider>{children}</CartProvider>
    </ToastProvider>
  );
}

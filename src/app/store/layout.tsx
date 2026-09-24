import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ToastProvider";

export default function StoreLayout({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

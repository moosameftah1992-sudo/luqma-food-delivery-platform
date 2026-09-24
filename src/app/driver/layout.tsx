import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ToastProvider";

export default function DriverLayout({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

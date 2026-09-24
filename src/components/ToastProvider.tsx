"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { playAlert, vibrate, type AlertKind } from "@/lib/sound";

export type Toast = {
  id: number;
  title: string;
  body?: string;
  kind: AlertKind;
};

type Ctx = {
  notify: (t: Omit<Toast, "id"> & { silent?: boolean }) => void;
  alertNew: (title: string, body?: string) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (t: Omit<Toast, "id"> & { silent?: boolean }) => {
      const id = ++counter;
      setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
      if (!t.silent) {
        playAlert(t.kind);
        if (t.kind === "order" || t.kind === "urgent") vibrate();
      }
      setTimeout(() => remove(id), t.kind === "order" ? 9000 : 5000);
    },
    [remove],
  );

  const alertNew = useCallback(
    (title: string, body?: string) => {
      notify({ title, body, kind: "order" });
    },
    [notify],
  );

  const value = useMemo(() => ({ notify, alertNew }), [notify, alertNew]);

  const tone: Record<AlertKind, string> = {
    order: "border-gold-400 bg-gradient-to-l from-gold-100 to-white",
    urgent: "border-red-300 bg-gradient-to-l from-red-50 to-white",
    success: "border-emerald-300 bg-gradient-to-l from-emerald-50 to-white",
    error: "border-red-300 bg-gradient-to-l from-red-50 to-white",
    info: "border-brand-200 bg-gradient-to-l from-brand-50 to-white",
  };

  const dot: Record<AlertKind, string> = {
    order: "bg-gold-400",
    urgent: "bg-red-500",
    success: "bg-emerald-500",
    error: "bg-red-500",
    info: "bg-brand-500",
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[999] flex flex-col items-center gap-2 px-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-lq-pop pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur ${tone[t.kind]}`}
          >
            <span
              className={`relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot[t.kind]} ${t.kind === "order" ? "lq-ring" : ""}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-brand-950">{t.title}</p>
              {t.body && (
                <p className="mt-0.5 truncate text-xs text-brand-700/80">
                  {t.body}
                </p>
              )}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="pointer-events-auto shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-brand-500 hover:bg-brand-100"
            >
              إخفاء
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    return {
      notify: () => {},
      alertNew: () => {},
    } as Ctx;
  }
  return ctx;
}

"use client";

import { useEffect, useState, type ReactNode } from "react";

export const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50";

export function Btn({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "gold" | "ghost" | "outline" | "danger" | "dark";
}) {
  const variants: Record<string, string> = {
    primary:
      "bg-brand-700 text-white hover:bg-brand-800 shadow-lg shadow-brand-700/20",
    gold: "bg-gold-400 text-brand-950 hover:bg-gold-300 shadow-lg shadow-gold-400/30",
    ghost: "bg-brand-50 text-brand-800 hover:bg-brand-100",
    outline:
      "border border-brand-200 bg-white text-brand-800 hover:bg-brand-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    dark: "bg-brand-950 text-white hover:bg-brand-900",
  };
  return (
    <button className={`${buttonBase} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`lq-card rounded-2xl ${className}`}>{children}</div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "brand",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "brand" | "gold" | "green" | "red" | "blue";
  icon?: ReactNode;
}) {
  const tones: Record<string, string> = {
    brand: "from-brand-700 to-brand-900",
    gold: "from-gold-500 to-gold-700",
    green: "from-emerald-500 to-emerald-700",
    red: "from-red-500 to-red-700",
    blue: "from-sky-500 to-sky-700",
  };
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-bl ${tones[tone]} p-4 text-white shadow-lg`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold text-white/70">{label}</p>
          <p className="mt-1 text-2xl font-black">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-white/70">{hint}</p>}
        </div>
        {icon && <div className="text-2xl opacity-80">{icon}</div>}
      </div>
      <div className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full bg-white/10" />
    </div>
  );
}

const badgeTones: Record<string, string> = {
  gray: "bg-slate-100 text-slate-600",
  brand: "bg-brand-100 text-brand-800",
  purple: "bg-brand-100 text-brand-800",
  gold: "bg-gold-100 text-gold-700 border border-gold-300",
  amber: "bg-amber-100 text-amber-800",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-700",
};

export function Badge({
  children,
  tone = "brand",
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTones | string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badgeTones[tone] ?? badgeTones.brand} ${className}`}
    >
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[900] flex items-end justify-center bg-brand-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="animate-lq-up max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl lq-scroll">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black text-brand-950">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-5 flex gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-brand-800">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-brand-950 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700 ${className}`}
    />
  );
}

export function Empty({
  icon = "🍽️",
  title,
  desc,
}: {
  icon?: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-200 bg-white/60 px-6 py-12 text-center">
      <div className="mb-3 text-4xl opacity-70">{icon}</div>
      <p className="text-sm font-extrabold text-brand-900">{title}</p>
      {desc && <p className="mt-1 text-xs text-slate-500">{desc}</p>}
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; icon?: string; badge?: number }[];
  active: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="lq-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
              isActive
                ? "bg-brand-700 text-white shadow-md shadow-brand-700/25"
                : "bg-white text-brand-700 hover:bg-brand-50"
            }`}
          >
            {t.icon && <span>{t.icon}</span>}
            {t.label}
            {!!t.badge && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                  isActive ? "bg-gold-400 text-brand-950" : "bg-gold-100 text-gold-700"
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function usePolling(fn: () => void, ms: number, deps: unknown[] = []) {
  useEffect(() => {
    fn();
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps]);
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2"
    >
      <span
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "right-0.5" : "right-[22px]"}`}
        />
      </span>
      {label && <span className="text-xs font-bold text-brand-800">{label}</span>}
    </button>
  );
}

export function ReasonBox({
  message,
  placeholder = "اكتب السبب هنا...",
  confirmLabel = "تأكيد",
  onConfirm,
  onCancel,
}: {
  message: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-sm text-brand-800">{message}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className={inputCls}
        placeholder={placeholder}
      />
      <div className="flex gap-2">
        <Btn
          variant="danger"
          className="flex-1"
          disabled={!text.trim()}
          onClick={() => onConfirm(text.trim())}
        >
          {confirmLabel}
        </Btn>
        <Btn variant="outline" className="flex-1" onClick={onCancel}>
          رجوع
        </Btn>
      </div>
    </div>
  );
}

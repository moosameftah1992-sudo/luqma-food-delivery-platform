"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { timeAgo } from "@/lib/utils";
import { playAlert, unlockAudio } from "@/lib/sound";

export type ShellUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  restaurantName?: string | null;
};

export type NavItem = { href: string; label: string; icon: string };

export function NotificationBell({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<
    { id: number; title: string; body: string; kind: string; createdAt: string; isRead: boolean }[]
  >([]);
  const [unread, setUnread] = useState(0);
  const { alertNew } = useToast();
  const seenRef = useState<Set<number>>(() => new Set<number>())[0];

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{
        notifications: { id: number; title: string; body: string; kind: string; createdAt: string; isRead: boolean }[];
        unread: number;
      }>("/api/notifications");
      const fresh = data.notifications.filter((n) => !seenRef.has(n.id));
      if (fresh.length && seenRef.size > 0) {
        alertNew(fresh[0].title, fresh[0].body);
      }
      data.notifications.forEach((n) => seenRef.add(n.id));
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      /* ignore */
    }
  }, [alertNew, seenRef]);

  useEffect(() => {
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="relative">
      <button
        onClick={() => {
          unlockAudio();
          setOpen((o) => !o);
          if (unread) {
            apiPost("/api/notifications", {}).then(load);
            setUnread(0);
          }
        }}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
          tone === "dark"
            ? "bg-white/10 text-white hover:bg-white/20"
            : "bg-brand-50 text-brand-800 hover:bg-brand-100"
        }`}
        title="الإشعارات"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="animate-lq-flash absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-400 px-1 text-[10px] font-black text-brand-950">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-lq-up absolute left-0 top-12 z-50 max-h-[70vh] w-80 overflow-y-auto rounded-2xl border border-brand-100 bg-white p-3 shadow-2xl lq-scroll">
            <p className="mb-2 px-1 text-xs font-black text-brand-900">
              الإشعارات
            </p>
            {items.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">
                لا توجد إشعارات
              </p>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className={`mb-1.5 rounded-xl border p-2.5 ${
                  n.isRead
                    ? "border-slate-100 bg-white"
                    : "border-gold-200 bg-gold-50"
                }`}
              >
                <p className="text-xs font-black text-brand-950">{n.title}</p>
                {n.body && (
                  <p className="mt-0.5 text-[11px] text-slate-500">{n.body}</p>
                )}
                <p className="mt-1 text-[10px] text-slate-400">
                  {timeAgo(n.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({
  user,
  title,
  subtitle,
  homeHref,
  nav = [],
  children,
  accent = "dark",
  right,
}: {
  user: ShellUser;
  title: string;
  subtitle?: string;
  homeHref: string;
  nav?: NavItem[];
  children: React.ReactNode;
  accent?: "dark" | "light";
  right?: React.ReactNode;
}) {
  const router = useRouter();
  const { notify } = useToast();

  const logout = async () => {
    await apiPost("/api/auth/logout");
    notify({ title: "تم تسجيل الخروج", kind: "info", silent: true });
    router.push(homeHref);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#f6f3fc] pb-24 sm:pb-0">
      <header
        className={`sticky top-0 z-50 ${
          accent === "dark"
            ? "lq-gradient text-white"
            : "border-b border-brand-100 bg-white text-brand-950"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={homeHref} className="shrink-0">
              <Logo size={38} subtitle={false} className="[&>span>span]:!text-white" />
            </Link>
            <div className="min-w-0">
              <p
                className={`truncate text-sm font-black ${accent === "dark" ? "text-white" : "text-brand-950"}`}
              >
                {title}
              </p>
              {subtitle && (
                <p
                  className={`truncate text-[11px] ${accent === "dark" ? "text-white/60" : "text-slate-500"}`}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {right}
            <NotificationBell tone={accent === "dark" ? "dark" : "light"} />
            <button
              onClick={logout}
              title="تسجيل الخروج"
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition ${
                accent === "dark"
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-brand-50 text-brand-800 hover:bg-brand-100"
              }`}
            >
              <span className="text-sm">🚪</span>
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>

        {nav.length > 0 && (
          <nav className="mx-auto hidden max-w-6xl gap-1 px-4 pb-3 sm:flex">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <span>{n.icon}</span>
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>

      {/* WhatsApp support */}
      <a
        href="https://wa.me/97336119511"
        target="_blank"
        rel="noreferrer"
        className="no-print fixed bottom-20 left-4 z-[800] flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-xs font-black text-white shadow-xl shadow-emerald-500/30 transition hover:scale-105 sm:bottom-6"
      >
        <span className="text-base">💬</span>
        دعم واتساب
      </a>

      {nav.length > 0 && (
        <nav className="fixed inset-x-0 bottom-0 z-[700] flex border-t border-brand-800/40 bg-brand-950/95 backdrop-blur sm:hidden">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold text-white/60"
            >
              <span className="text-lg">{n.icon}</span>
              {n.label}
            </Link>
          ))}
          <button
            onClick={logout}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold text-white/60"
          >
            <span className="text-lg">🚪</span>
            خروج
          </button>
        </nav>
      )}
    </div>
  );
}

export function useNewOrderAlarm(
  ids: number[],
  label: (id: number) => string,
) {
  const { alertNew } = useToast();
  const prev = useRef<Set<number> | null>(null);

  useEffect(() => {
    const current = new Set(ids);
    if (prev.current === null) {
      prev.current = current;
      return;
    }
    const fresh = ids.filter((id) => !prev.current!.has(id));
    prev.current = current;
    if (fresh.length) {
      playAlert("order");
      alertNew("طلب جديد وارد 🔔", label(fresh[0]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);
}

import Link from "next/link";
import { Logo, LogoMark } from "@/components/Logo";

export const dynamic = "force-dynamic";

const INTERFACES = [
  {
    href: "/customer",
    title: "واجهة العميل",
    en: "Customer App",
    desc: "تصفح المطاعم، اطلب online، ادفع بالبطاقة أو BenefitPay وتابع طلبك لحظة بلحظة.",
    icon: "🛍️",
    features: ["تصنيف حسب المحافظة والمنطقة", "دفع إلكتروني فقط", "تقييم بعد التوصيل"],
    accent: "from-brand-600 to-brand-900",
  },
  {
    href: "/store",
    title: "إدارة المتجر",
    en: "Store Dashboard",
    desc: "إدارة القائمة والأصناف والأحجام والإضافات، استقبال الطلبات وتقارير مالية شاملة.",
    icon: "🏪",
    features: ["تنبيهات صوتية للطلبات", "طلبات تعديل الأسعار", "تقارير Excel / PDF"],
    accent: "from-gold-500 to-gold-700",
  },
  {
    href: "/driver",
    title: "مندوب التوصيل",
    en: "Driver Dashboard",
    desc: "سجّل بياناتك، استقبل الطلبات المتاحة واقبلها بأولوية الحضور، ودفتر أرباحك.",
    icon: "🛵",
    features: ["بث الطلبات لكل المتصلين", "تبديل أونلاين / أوفلاين", "كشف حساب بالفترة"],
    accent: "from-sky-500 to-sky-800",
  },
  {
    href: "/admin",
    title: "لوحة الأدمن الرئيسية",
    en: "Super Admin",
    desc: "التحكم الكامل: المتاجر، المناديب، القوائم، طلبات الأسعار والعمولات.",
    icon: "👑",
    features: ["اعتماد المناديب", "اعتماد/رفض الأسعار", "عمولة ثابتة 0.500 للطلب"],
    accent: "from-brand-950 to-brand-700",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Splash hero */}
      <section className="lq-gradient relative overflow-hidden px-5 pb-24 pt-10">
        <div className="pointer-events-none absolute -left-20 top-24 h-64 w-64 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="animate-lq-pop flex items-center gap-3">
              <Logo size={46} />
            </div>
            <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold text-white/80">
              البحرين · Bahrain · د.ب
            </span>
          </div>

          <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
            <div className="animate-lq-up">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-gold-400/15 px-3 py-1 text-xs font-bold text-gold-300">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
                منصة توصيل متكاملة بأربع واجهات
              </p>
              <h1 className="text-4xl font-black leading-[1.25] text-white sm:text-5xl lg:text-6xl">
                لقمتك المفضلة،
                <br />
                <span className="lq-gold-text">توصلك أينما كنت</span>
              </h1>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/70">
                لقمة Luqma تربط العملاء بأفضل المتاجر، وتوفر للمتاجر والمناديب
                أدوات إدارة احترافية مع تنبيهات فورية صوتية ومرئية لكل طلب جديد.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/customer"
                  className="rounded-2xl bg-gold-400 px-6 py-3.5 text-sm font-black text-brand-950 shadow-xl shadow-gold-500/30 transition hover:bg-gold-300"
                >
                  ابدأ الطلب الآن →
                </Link>
                <Link
                  href="/driver"
                  className="rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/20"
                >
                  انضم كمندوب توصيل
                </Link>
              </div>

              <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
                {[
                  { v: "0.500", l: "عمولة المتجر / طلب" },
                  { v: "10%", l: "عمولة التوصيل" },
                  { v: "4", l: "واجهات متكاملة" },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-2xl border border-white/15 bg-white/5 p-3 backdrop-blur"
                  >
                    <p className="text-lg font-black text-gold-300">{s.v}</p>
                    <p className="mt-1 text-[10px] font-semibold text-white/60">
                      {s.l}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="overflow-hidden rounded-[32px] border-4 border-white/10 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/hero.jpg"
                  alt="لقمة"
                  className="h-[420px] w-full object-cover"
                />
              </div>
              <div className="animate-lq-pop absolute -bottom-6 right-6 flex items-center gap-3 rounded-2xl border border-gold-400/30 bg-brand-950/90 p-4 backdrop-blur">
                <span className="lq-ring relative flex h-10 w-10 items-center justify-center rounded-full bg-gold-400 text-lg">
                  🔔
                </span>
                <div>
                  <p className="text-xs font-black text-white">طلب جديد وارد!</p>
                  <p className="text-[11px] text-white/60">LQ-1042 · 7.250 د.ب</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interfaces */}
      <section className="mx-auto -mt-10 max-w-6xl px-5 pb-16">
        <div className="mb-8 text-center">
          <p className="text-xs font-extrabold tracking-[0.3em] text-gold-600">
            LUQMA ECOSYSTEM
          </p>
          <h2 className="mt-2 text-2xl font-black text-brand-950">
            اختر واجهتك للدخول
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {INTERFACES.map((i, idx) => (
            <Link
              key={i.href}
              href={i.href}
              className="animate-lq-up group relative overflow-hidden rounded-3xl bg-white p-5 shadow-lg shadow-brand-900/5 ring-1 ring-brand-100 transition hover:-translate-y-1 hover:shadow-2xl"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-bl ${i.accent} text-2xl shadow-lg`}
              >
                {i.icon}
              </div>
              <h3 className="text-base font-black text-brand-950">{i.title}</h3>
              <p className="mt-0.5 text-[10px] font-bold tracking-widest text-slate-400">
                {i.en}
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">
                {i.desc}
              </p>
              <ul className="mt-4 space-y-1.5">
                {i.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-[11px] font-bold text-brand-800"
                  >
                    <span className="text-gold-500">✦</span>
                    {f}
                  </li>
                ))}
              </ul>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-black text-brand-700 transition group-hover:gap-2">
                الدخول <span className="text-gold-500">←</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Demo credentials */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="overflow-hidden rounded-3xl border border-brand-100 bg-white">
          <div className="flex items-center gap-3 border-b border-brand-50 bg-brand-50/60 px-5 py-4">
            <LogoMark size={30} />
            <div>
              <p className="text-sm font-black text-brand-950">
                حسابات تجريبية جاهزة
              </p>
              <p className="text-[11px] text-slate-500">
                استخدمها لاستكشاف كل واجهة مباشرة
              </p>
            </div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { r: "عميل", e: "customer@luqma.bh", p: "customer123" },
              { r: "متجر", e: "grills@luqma.bh", p: "store123" },
              { r: "مندوب", e: "driver1@luqma.bh", p: "driver123" },
              { r: "أدمن", e: "admin@luqma.bh", p: "Admin@123" },
            ].map((c) => (
              <div
                key={c.e}
                className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5"
              >
                <p className="mb-2 text-[11px] font-black text-gold-600">{c.r}</p>
                <p className="text-[11px] font-mono text-brand-900" dir="ltr">
                  {c.e}
                </p>
                <p className="text-[11px] font-mono text-slate-500" dir="ltr">
                  {c.p}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <a
        href="https://wa.me/97336119511"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 left-5 z-[800] flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-xs font-black text-white shadow-xl shadow-emerald-500/30 transition hover:scale-105"
      >
        <span className="text-base">💬</span>
        دعم واتساب +97336119511
      </a>

      <footer className="border-t border-brand-100 bg-brand-950 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <Logo size={38} subtitle={false} className="[&>span>span]:!text-white" />
          <p className="text-[11px] text-white/50">
            © {new Date().getFullYear()} لقمة Luqma — جميع الحقوق محفوظة
          </p>
          <a
            href="https://wa.me/97336119511"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-white"
          >
            دعم واتساب +97336119511
          </a>
        </div>
      </footer>
    </main>
  );
}

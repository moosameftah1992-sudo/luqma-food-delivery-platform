"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Btn, Field, inputCls } from "@/components/ui";
import { apiPost } from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import { unlockAudio } from "@/lib/sound";

type Mode = "login" | "register" | "verify";

export function AuthScreen({
  role,
  title,
  subtitle,
  successHref,
  allowRegister = true,
  registerHref,
  accent = "لقمة",
  note,
}: {
  role: "customer" | "store" | "driver" | "admin";
  title: string;
  subtitle: string;
  successHref: string;
  allowRegister?: boolean;
  registerHref?: string;
  accent?: string;
  note?: React.ReactNode;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [err, setErr] = useState("");

  // driver extra
  const [nationalId, setNationalId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("دراجة نارية");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [terms, setTerms] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "login") {
        await apiPost("/api/auth/login", { email, password, role });
        unlockAudio();
        notify({ title: "أهلاً بعودتك 👋", kind: "success", silent: true });
        router.push(successHref);
        router.refresh();
        return;
      }
      if (mode === "register") {
        if (role === "driver" && !terms) {
          setErr("يجب الموافقة على الشروط والأحكام");
          setLoading(false);
          return;
        }
        const res = await apiPost<{ devCode: string }>("/api/auth/register", {
          email,
          password,
          fullName,
          phone,
          role,
          nationalId,
          licenseNumber,
          vehicleType,
          vehiclePlate,
          termsAccepted: terms,
        });
        setDevCode(res.devCode ?? "");
        setMode("verify");
        notify({
          title: "تم إرسال رمز التحقق",
          body: "أدخل الرمز لتأكيد بريدك الإلكتروني",
          kind: "info",
          silent: true,
        });
        return;
      }
      // verify
      await apiPost("/api/auth/verify", { email, code });
      unlockAudio();
      notify({ title: "تم تأكيد الحساب ✅", kind: "success", silent: true });
      router.push(successHref);
      router.refresh();
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="lq-gradient relative hidden flex-1 flex-col justify-between p-10 lg:flex">
        <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl" />
        <Link href="/" className="flex items-center gap-3">
          <Logo size={44} />
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-black leading-snug text-white">
            {accent === "لقمة" ? (
              <>
                كل ما تشتهيه،
                <br />
                <span className="lq-gold-text">في لقمة واحدة</span>
              </>
            ) : (
              accent
            )}
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            منصة لقمة توفر لك تجربة طلب وتوصيل احترافية بدفع إلكتروني آمن،
            ومتابعة لحظية لكل خطوة.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 text-white/70">
            {[
              { i: "🔐", t: "دفع إلكتروني فقط" },
              { i: "🔔", t: "تنبيهات فورية" },
              { i: "📍", t: "تغطية كل المحافظات" },
              { i: "💬", t: "دعم واتساب مباشر" },
            ].map((f) => (
              <div
                key={f.t}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-bold"
              >
                <span>{f.i}</span>
                {f.t}
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-white/40">
          © {new Date().getFullYear()} لقمة Luqma
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-[#f6f3fc] p-5">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <Logo size={48} />
          </div>

          <div className="lq-card rounded-3xl p-6 sm:p-8">
            <div className="mb-6">
              <p className="text-[11px] font-black tracking-widest text-gold-600">
                {mode === "login"
                  ? "تسجيل الدخول"
                  : mode === "register"
                    ? "إنشاء حساب"
                    : "تأكيد البريد"}
              </p>
              <h1 className="mt-1 text-xl font-black text-brand-950">{title}</h1>
              <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "verify" && (
                <>
                  <div className="rounded-2xl border border-gold-200 bg-gold-50 p-3 text-center">
                    <p className="text-[11px] font-bold text-gold-700">
                      (بيئة تجريبية) رمز التحقق المرسل إلى {email}
                    </p>
                    <p className="mt-1 text-2xl font-black tracking-[0.4em] text-brand-950">
                      {devCode || "••••••"}
                    </p>
                  </div>
                  <Field label="رمز التحقق">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className={`${inputCls} text-center tracking-[0.5em]`}
                      placeholder="000000"
                      maxLength={6}
                      dir="ltr"
                    />
                  </Field>
                </>
              )}

              {mode !== "verify" && (
                <>
                  <Field label="البريد الإلكتروني">
                    <input
                      type="email"
                      required
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`${inputCls} text-left`}
                      placeholder="name@example.com"
                      autoComplete="email"
                    />
                  </Field>

                  {mode === "register" && (
                    <>
                      <Field label="الاسم الكامل">
                        <input
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className={inputCls}
                          placeholder="مثال: محمد أحمد"
                        />
                      </Field>
                      <Field label="رقم الجوال">
                        <input
                          dir="ltr"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={`${inputCls} text-left`}
                          placeholder="9733xxxxxxx+"
                        />
                      </Field>
                    </>
                  )}

                  <Field label="كلمة المرور">
                    <input
                      type="password"
                      required
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputCls} text-left`}
                      placeholder="••••••"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                  </Field>

                  {mode === "register" && role === "driver" && (
                    <div className="space-y-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
                      <p className="text-xs font-black text-brand-900">
                        بيانات الاعتماد
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="رقم بطاقة الهوية">
                          <input
                            required
                            dir="ltr"
                            value={nationalId}
                            onChange={(e) => setNationalId(e.target.value)}
                            className={`${inputCls} text-left`}
                            placeholder="880123456"
                          />
                        </Field>
                        <Field label="رقم رخصة القيادة">
                          <input
                            required
                            dir="ltr"
                            value={licenseNumber}
                            onChange={(e) => setLicenseNumber(e.target.value)}
                            className={`${inputCls} text-left`}
                            placeholder="BH-DL-2024-0000"
                          />
                        </Field>
                        <Field label="نوع المركبة">
                          <select
                            value={vehicleType}
                            onChange={(e) => setVehicleType(e.target.value)}
                            className={inputCls}
                          >
                            <option>دراجة نارية</option>
                            <option>سيارة</option>
                            <option>ونيت</option>
                            <option>دراجة هوائية</option>
                          </select>
                        </Field>
                        <Field label="رقم اللوحة">
                          <input
                            dir="ltr"
                            value={vehiclePlate}
                            onChange={(e) => setVehiclePlate(e.target.value)}
                            className={`${inputCls} text-left`}
                            placeholder="123456"
                          />
                        </Field>
                      </div>
                      <label className="flex items-start gap-2 text-[11px] font-semibold text-brand-800">
                        <input
                          type="checkbox"
                          checked={terms}
                          onChange={(e) => setTerms(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-brand-700"
                        />
                        <span>
                          أقر بأن جميع البيانات صحيحة وأوافق على{" "}
                          <span className="font-black text-gold-600">
                            الشروط والأحكام
                          </span>{" "}
                          وسياسة الخصوصية، وأتحمل مسؤولية أي بيانات غير صحيحة.
                        </span>
                      </label>
                    </div>
                  )}
                </>
              )}

              {err && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                  {err}
                </p>
              )}

              <Btn
                type="submit"
                variant="gold"
                className="w-full py-3"
                disabled={loading}
              >
                {loading
                  ? "جارٍ المعالجة..."
                  : mode === "login"
                    ? "دخول"
                    : mode === "register"
                      ? "إنشاء الحساب"
                      : "تأكيد الحساب"}
              </Btn>
            </form>

            <div className="mt-5 space-y-2 text-center">
              {mode === "login" && allowRegister && registerHref && (
                <p className="text-xs text-slate-500">
                  ليس لديك حساب؟{" "}
                  <Link
                    href={registerHref}
                    className="font-black text-brand-700 hover:underline"
                  >
                    سجّل الآن
                  </Link>
                </p>
              )}
              {mode === "register" && (
                <p className="text-xs text-slate-500">
                  لديك حساب بالفعل؟{" "}
                  <button
                    onClick={() => setMode("login")}
                    className="font-black text-brand-700 hover:underline"
                  >
                    تسجيل الدخول
                  </button>
                </p>
              )}
              {mode === "verify" && (
                <p className="text-xs text-slate-500">
                  لم يصلك الرمز؟{" "}
                  <button
                    onClick={() => setMode("register")}
                    className="font-black text-brand-700 hover:underline"
                  >
                    إعادة الإرسال
                  </button>
                </p>
              )}
              {!allowRegister && note}
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] text-slate-400">
            <Link href="/" className="hover:text-brand-700">
              ← العودة للصفحة الرئيسية
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

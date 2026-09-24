import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ensureSeeded } from "@/lib/seed";

export const metadata: Metadata = {
  title: "لقمة Luqma | منصة التوصيل",
  description:
    "لقمة Luqma — منصة التوصيل المتكاملة للعملاء والمتاجر ومندوبي التوصيل.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  await ensureSeeded();
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#f6f3fc] text-brand-950 antialiased">
        {children}
      </body>
    </html>
  );
}

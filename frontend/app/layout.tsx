import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Manrope } from "next/font/google";
import { Suspense } from "react";
import RouteProgress from "@/components/RouteProgress";
import { getMe } from "@/lib/auth";
import { resolveTheme } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Xalqaro Innovatsion Universiteti KPI tizimi",
  description: "Xalqaro Innovatsion Universiteti xodimlarini baholash va KPI boshqaruv tizimi",
  icons: {
    icon: "https://xiuedu.uz/media/uploads/2026/04/2bf2250039ec4066a7bc6758a2ecb5c4.webp",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const user = await getMe(locale);
  const theme = resolveTheme(user);

  return (
    <html lang={locale} className={`${manrope.variable} ${theme === "dark" ? "dark" : ""}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

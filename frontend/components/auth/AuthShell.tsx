import { getLocale, getTranslations } from "next-intl/server";
import TopRightControls from "@/components/TopRightControls";
import type { Theme } from "@/lib/theme-config";
import { getCompanySettings } from "@/lib/company";
import PreviewMock from "./PreviewMock";

export default async function AuthShell({
  theme,
  authenticated,
  children,
}: {
  theme: Theme;
  authenticated: boolean;
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const t = await getTranslations("authShell");
  const company = await getCompanySettings(locale);
  const brandName = company?.name ?? t("brandName");
  const brandInitial = brandName.charAt(0).toUpperCase();

  return (
    <div className="relative flex min-h-screen bg-bg">
      <aside className="relative hidden w-[420px] shrink-0 flex-col justify-between overflow-hidden bg-sidebar-bg bg-gradient-to-br from-sidebar-bg-2 via-sidebar-bg to-sidebar-bg px-10 py-12 text-white lg:flex xl:w-[480px]">
        <div
          className="animate-grid-pan pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.14) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />
        <div
          className="animate-blob-a pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sidebar-accent/20 blur-3xl"
          aria-hidden
        />
        <div
          className="animate-blob-b pointer-events-none absolute -right-16 top-1/3 h-56 w-56 rounded-full bg-accent/25 blur-3xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-2.5">
          {company?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo_url}
              alt={brandName}
              className="h-9 w-9 shrink-0 rounded-lg border border-white/20 bg-white/95 object-contain p-1 shadow-soft"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-accent to-accent text-sm font-bold text-white shadow-[0_2px_10px_-1px_rgba(141,151,255,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]">
              {brandInitial}
            </div>
          )}
          <span className="text-[15px] font-semibold tracking-tight">{brandName}</span>
        </div>

        <div className="relative flex flex-1 flex-col justify-center py-10">
          <h2 className="max-w-[15ch] text-[26px] font-semibold leading-[1.2] tracking-tight text-white">
            {t("tagline")}
          </h2>

          <PreviewMock
            applicationsLabel={t("mock.applications")}
            resultLabel={t("mock.result")}
            annexLabel={t("mock.annex")}
            periodLabel={t("mock.period")}
          />
        </div>

        <p className="relative text-xs text-white/45">{t("footer")}</p>
      </aside>

      {/* Seam blend: dissolves the hard color edge between the panels into a soft gradient. */}
      <div
        className="pointer-events-none absolute inset-y-0 left-[420px] z-10 hidden w-48 -translate-x-1/2 xl:left-[480px] lg:block"
        style={{
          background:
            "linear-gradient(to right, transparent, color-mix(in srgb, var(--sidebar-bg-2) 35%, transparent) 45%, transparent)",
        }}
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col overflow-y-auto">
        <div
          className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(60%_100%_at_50%_0%,var(--accent-soft),transparent)] opacity-70 lg:left-[420px] xl:left-[480px]"
          aria-hidden
        />

        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 lg:hidden">
          <div className="flex items-center gap-2.5">
            {company?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logo_url}
                alt={brandName}
                className="h-8 w-8 shrink-0 rounded-lg border border-border bg-white object-contain p-1 shadow-soft"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#3646c9] text-sm font-bold text-white shadow-[0_2px_10px_-1px_rgba(76,95,238,0.5)]">
                {brandInitial}
              </div>
            )}
            <span className="text-sm font-semibold tracking-tight text-text-1">{brandName}</span>
          </div>
          <TopRightControls
            theme={theme}
            authenticated={authenticated}
            className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1 shadow-sm"
          />
        </div>

        <TopRightControls
          theme={theme}
          authenticated={authenticated}
          className="absolute right-6 top-6 z-20 hidden items-center gap-1 rounded-lg border border-border bg-surface p-1 shadow-sm lg:flex"
        />
        <div className="relative flex flex-1 items-center justify-center px-4 py-12 lg:py-16">{children}</div>
      </div>
    </div>
  );
}

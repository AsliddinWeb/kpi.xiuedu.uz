import { getLocale, getTranslations } from "next-intl/server";

export default async function WelcomeHero({ fullName, role }: { fullName: string; role: string }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const roleT = await getTranslations("roles");
  const today = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(),
  );

  return (
    <div className="relative animate-fade-up overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-accent-soft/50 via-surface to-surface p-8 shadow-soft">
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent-soft blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-sidebar-accent/10 blur-3xl"
        aria-hidden
      />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-[#8b93f5] to-accent" aria-hidden />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-1">{t("welcome", { name: fullName })}</h1>
          <p className="mt-1.5 text-sm capitalize text-text-2">{today}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-accent to-[#3646c9] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_4px_10px_-2px_rgba(76,95,238,0.45)]">
          {roleT(role)}
        </span>
      </div>
    </div>
  );
}

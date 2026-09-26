import { IconArrowRight, IconChartBar, IconFileUpload, IconShieldCheck } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import ScrollReveal from "@/components/home/ScrollReveal";
import TopRightControls from "@/components/TopRightControls";
import type { CompanySettings } from "@/lib/company";
import type { PublicLeaderboardRow, PublicStats } from "@/lib/public";
import type { Theme } from "@/lib/theme-config";

const STEP_ICONS = [IconFileUpload, IconShieldCheck, IconChartBar];

type StepItem = { title: string; body: string };

export default async function PublicHome({
  theme,
  company,
  stats,
  leaderboard,
}: {
  theme: Theme;
  company: CompanySettings | null;
  stats: PublicStats | null;
  leaderboard: PublicLeaderboardRow[];
}) {
  const t = await getTranslations("home");
  const brandName = company?.name ?? "XIU KPI";
  const brandInitial = brandName.charAt(0).toUpperCase();
  const year = new Date().getFullYear();
  const steps = t.raw("steps.items") as StepItem[];
  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="min-h-screen bg-bg">
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(65%_85%_at_50%_-10%,var(--accent-soft),transparent)]"
        />

        <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            {company?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logo_url}
                alt={brandName}
                className="h-8 w-8 shrink-0 rounded-lg border border-border bg-surface object-contain p-1"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#3646c9] text-sm font-bold text-white">
                {brandInitial}
              </div>
            )}
            <span className="truncate text-[15px] font-semibold tracking-tight text-text-1">{brandName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TopRightControls
              theme={theme}
              authenticated={false}
              className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1"
            />
            <Link
              href="/login"
              className="flex items-center rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3646c9] sm:px-4"
            >
              {t("nav.cta")}
            </Link>
          </div>
        </header>

        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-14 lg:grid-cols-[1.3fr_0.7fr] lg:items-center lg:gap-12">
          <div>
            <h1 className="animate-fade-up text-balance text-[2.1rem] font-bold leading-[1.15] tracking-tight text-text-1 sm:text-[2.6rem] lg:text-[2.2rem] xl:text-[2.9rem]">
              {t("hero.headline")}
            </h1>
            <p
              className="animate-fade-up mt-5 max-w-[46ch] text-balance text-[15px] leading-relaxed text-text-2"
              style={{ animationDelay: "70ms" }}
            >
              {t("hero.subtext")}
            </p>
            <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "140ms" }}>
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_-2px_rgba(76,95,238,0.45)] transition-all hover:-translate-y-0.5 hover:bg-[#3646c9] hover:shadow-lg"
              >
                {t("hero.ctaPrimary")}
                <IconArrowRight size={16} stroke={2} />
              </Link>
              <a
                href="#leaderboard"
                className="rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text-1 transition-colors hover:border-accent/40"
              >
                {t("hero.ctaSecondary")}
              </a>
            </div>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-lg">
              <p className="text-xs font-medium text-text-3">{t("hero.previewLabel")}</p>
              {topThree.length === 0 ? (
                <p className="mt-6 py-4 text-center text-sm text-text-3">{t("hero.previewEmpty")}</p>
              ) : (
                <div className="mt-4 space-y-1">
                  {topThree.map((row, i) => (
                    <div key={`${row.full_name}-${i}`} className="flex items-center gap-3 rounded-lg px-1 py-2.5">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? "bg-accent text-white" : "bg-accent-soft text-accent"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-1">{row.full_name}</span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-text-1">{row.total_score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <ScrollReveal className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-2 divide-x divide-y divide-border border-y border-border sm:grid-cols-4 sm:divide-y-0">
          <StatCell label={t("stats.employees")} value={stats ? String(stats.total_employees) : "0"} />
          <StatCell label={t("stats.departments")} value={stats ? String(stats.total_departments) : "0"} />
          <StatCell label={t("stats.average")} value={stats?.average_score != null ? String(stats.average_score) : "-"} />
          <StatCell label={t("stats.top")} value={stats?.top_score != null ? String(stats.top_score) : "-"} />
        </div>
      </ScrollReveal>

      <section className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
        <ScrollReveal>
          <h2 className="text-2xl font-bold tracking-tight text-text-1 sm:text-3xl">{t("steps.heading")}</h2>
        </ScrollReveal>
        <div className="relative mt-10 space-y-10 border-l border-border pl-8 sm:pl-10">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <ScrollReveal key={step.title} delayMs={i * 80} className="relative">
                <span className="absolute -left-[2.85rem] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent sm:-left-[3.35rem]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex items-center gap-2">
                  {Icon && <Icon size={18} stroke={1.75} className="text-accent" />}
                  <h3 className="font-semibold text-text-1">{step.title}</h3>
                </div>
                <p className="mt-1.5 max-w-[55ch] text-sm leading-relaxed text-text-2">{step.body}</p>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      <section id="leaderboard" className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
        <ScrollReveal>
          <h2 className="text-2xl font-bold tracking-tight text-text-1 sm:text-3xl">{t("leaderboard.heading")}</h2>
          <p className="mt-1.5 text-sm text-text-2">
            {t("leaderboard.subtext", { year: stats?.academic_year ?? "" })}
          </p>
        </ScrollReveal>

        {leaderboard.length === 0 ? (
          <ScrollReveal delayMs={80} className="mt-8 rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <p className="text-sm font-semibold text-text-1">{t("leaderboard.empty")}</p>
          </ScrollReveal>
        ) : (
          <div className="mt-8 divide-y divide-border border-y border-border">
            {leaderboard.map((row, i) => (
              <ScrollReveal key={`${row.full_name}-${i}`} delayMs={Math.min(i * 40, 280)}>
                <div className="flex items-center gap-4 py-4">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      i === 0 ? "bg-accent text-white" : "bg-accent-soft text-accent"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-bold text-text-2">
                    {row.full_name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-1">{row.full_name}</p>
                    {row.department_name && <p className="truncate text-xs text-text-3">{row.department_name}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-base font-bold tabular-nums text-text-1">{row.total_score}</span>
                    <span className="ml-1 text-xs text-text-3">/ {row.template_max_score}</span>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-text-3">
            {brandName} · {t("footer.tagline")}
          </p>
          <p className="text-xs text-text-3">
            © {year} {brandName}. {t("footer.rights")}.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-6 sm:px-6">
      <p className="text-3xl font-bold tracking-tight text-text-1 tabular-nums">{value}</p>
      <p className="text-xs text-text-3">{label}</p>
    </div>
  );
}

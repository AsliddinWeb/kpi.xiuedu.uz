import {
  IconArrowRight,
  IconBan,
  IconBellRinging,
  IconCertificate,
  IconChartBar,
  IconCircleCheck,
  IconClockHour4,
  IconFileUpload,
  IconShieldCheck,
  IconTrophy,
} from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import AnimatedNumber from "@/components/home/AnimatedNumber";
import ScrollReveal from "@/components/home/ScrollReveal";
import StatCard from "@/components/dashboard/StatCard";
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

  return (
    <div className="min-h-screen bg-bg">
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

      {company?.cover_image_url ? (
        <section
          className="relative flex h-[26rem] items-center justify-center bg-cover bg-center px-5 text-center sm:h-[30rem]"
          style={{ backgroundImage: `url(${company.cover_image_url})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/25" aria-hidden />
          <div className="relative">
            <h1 className="animate-fade-up text-balance text-[1.9rem] font-bold leading-[1.2] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
              {t("hero.headline")}
            </h1>
            <p
              className="animate-fade-up mx-auto mt-4 max-w-xl text-balance text-[15px] leading-relaxed text-white/85"
              style={{ animationDelay: "70ms" }}
            >
              {t("hero.subtext")}
            </p>
            <div className="animate-fade-up mt-7 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "140ms" }}>
              <Link
                href="/login"
                className="group flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#3646c9]"
              >
                {t("hero.ctaPrimary")}
                <IconArrowRight size={16} stroke={2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#leaderboard"
                className="rounded-lg border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                {t("hero.ctaSecondary")}
              </a>
            </div>
          </div>
        </section>
      ) : (
        <div className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(65%_85%_at_50%_-10%,var(--accent-soft),transparent)]"
          />

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
                  className="group flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_-2px_rgba(76,95,238,0.45)] transition-all hover:-translate-y-0.5 hover:bg-[#3646c9] hover:shadow-lg"
                >
                  {t("hero.ctaPrimary")}
                  <IconArrowRight size={16} stroke={2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
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
              <div className="relative mx-auto aspect-square w-full max-w-[22rem]">
                <div className="absolute inset-8 flex flex-col items-center justify-center rounded-[2rem] border border-border bg-gradient-to-br from-accent-soft to-surface p-8 text-center shadow-lg sm:inset-10">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_10px_24px_-6px_rgba(76,95,238,0.55)]">
                    <IconCertificate size={30} stroke={1.6} />
                  </div>
                  <p className="mt-5 text-base font-semibold text-text-1">{t("hero.visual.primaryTitle")}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-2">{t("hero.visual.primaryBody")}</p>
                </div>

                <div className="animate-float-a absolute -right-1 top-4 flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg sm:right-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
                    <IconTrophy size={18} stroke={1.75} />
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold text-text-1">{t("hero.visual.badgeRanking")}</span>
                </div>

                <div className="animate-float-b absolute -left-1 bottom-8 flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg sm:left-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
                    <IconShieldCheck size={18} stroke={1.75} />
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold text-text-1">{t("hero.visual.badgeNizom")}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <ScrollReveal>
          <h2 className="mb-6 text-xl font-bold tracking-tight text-text-1 sm:text-2xl">{t("stats.heading")}</h2>
        </ScrollReveal>
        <div className="stagger-fade grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("stats.new")}
            value={<AnimatedNumber value={stats?.arizalar_new ?? 0} />}
            icon={IconBellRinging}
            tone="accent"
          />
          <StatCard
            title={t("stats.inReview")}
            value={<AnimatedNumber value={stats?.arizalar_in_review ?? 0} />}
            icon={IconClockHour4}
            tone="warning"
          />
          <StatCard
            title={t("stats.approved")}
            value={<AnimatedNumber value={stats?.arizalar_approved ?? 0} />}
            icon={IconCircleCheck}
            tone="success"
          />
          <StatCard
            title={t("stats.rejected")}
            value={<AnimatedNumber value={stats?.arizalar_rejected ?? 0} />}
            icon={IconBan}
            tone="danger"
          />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
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

      <section id="leaderboard" className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
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
          <ScrollReveal delayMs={80} className="mt-8 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[480px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-alt">
                  <th className="w-12 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-3">#</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-3">{t("leaderboard.fullName")}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-3">
                    {t("leaderboard.score")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaderboard.map((row, i) => (
                  <tr key={`${row.full_name}-${i}`} className="bg-surface transition-colors hover:bg-surface-alt">
                    <td className="px-4 py-3.5">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? "bg-accent text-white" : "bg-accent-soft text-accent"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-text-1">{row.full_name}</p>
                      {row.department_name && <p className="text-xs text-text-3">{row.department_name}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-base font-bold tabular-nums text-text-1">{row.total_score}</span>
                      <span className="ml-1 text-xs text-text-3">/ {row.template_max_score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollReveal>
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

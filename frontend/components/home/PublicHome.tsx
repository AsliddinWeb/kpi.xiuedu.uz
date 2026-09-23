import {
  IconArrowRight,
  IconBuildingBank,
  IconCrown,
  IconGauge,
  IconMedal,
  IconTrophy,
  IconUsersGroup,
} from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import StatCard from "@/components/dashboard/StatCard";
import TopRightControls from "@/components/TopRightControls";
import type { CompanySettings } from "@/lib/company";
import type { PublicLeaderboardRow, PublicStats } from "@/lib/public";
import type { Theme } from "@/lib/theme-config";

const RANK_META = [
  { icon: IconCrown, tone: "bg-[#f5b301] text-white", ring: "ring-2 ring-[#f5b301]" },
  { icon: IconMedal, tone: "bg-[#9aa4b2] text-white", ring: "ring-2 ring-[#9aa4b2]" },
  { icon: IconMedal, tone: "bg-[#c9834a] text-white", ring: "ring-2 ring-[#c9834a]" },
];

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

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(60%_100%_at_50%_0%,var(--accent-soft),transparent)] opacity-80"
        aria-hidden
      />
      <div
        className="animate-grid-pan pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden
      />
      <div
        className="animate-blob-a pointer-events-none absolute -right-24 top-10 -z-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div
        className="animate-blob-b pointer-events-none absolute -left-24 top-64 -z-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-2.5">
          {company?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo_url}
              alt={brandName}
              className="h-9 w-9 shrink-0 rounded-lg border border-border bg-surface object-contain p-1 shadow-soft"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#3646c9] text-sm font-bold text-white shadow-[0_2px_10px_-1px_rgba(76,95,238,0.5)]">
              {brandInitial}
            </div>
          )}
          <span className="text-[15px] font-semibold tracking-tight text-text-1">{brandName}</span>
        </div>
        <div className="flex items-center gap-2">
          <TopRightControls
            theme={theme}
            authenticated={false}
            className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1 shadow-sm"
          />
          <Link
            href="/login"
            className="hidden items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_10px_-1px_rgba(76,95,238,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-lg sm:flex"
          >
            {t("nav.login")}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 pb-16 pt-10 text-center sm:px-8 sm:pb-24 sm:pt-16">
        <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          {t("hero.eyebrow")}
        </p>
        <h1
          className="animate-fade-up mt-4 text-balance text-[2rem] font-bold leading-[1.15] tracking-tight text-text-1 sm:text-[2.75rem]"
          style={{ animationDelay: "60ms" }}
        >
          {t("hero.title")}
        </h1>
        <p
          className="animate-fade-up mx-auto mt-5 max-w-xl text-balance text-[15px] leading-relaxed text-text-2"
          style={{ animationDelay: "120ms" }}
        >
          {t("hero.subtitle")}
        </p>
        <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "180ms" }}>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_-2px_rgba(76,95,238,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            {t("hero.cta")}
            <IconArrowRight size={16} stroke={2} />
          </Link>
          <a
            href="#leaderboard"
            className="rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text-1 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
          >
            {t("hero.ctaSecondary")}
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="stagger-fade grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("stats.employees")}
            value={stats ? String(stats.total_employees) : "—"}
            icon={IconUsersGroup}
          />
          <StatCard
            title={t("stats.departments")}
            value={stats ? String(stats.total_departments) : "—"}
            icon={IconBuildingBank}
            tone="accent"
          />
          <StatCard
            title={t("stats.averageScore")}
            value={stats?.average_score != null ? String(stats.average_score) : "—"}
            icon={IconGauge}
            tone="success"
          />
          <StatCard
            title={t("stats.topScore")}
            value={stats?.top_score != null ? String(stats.top_score) : "—"}
            icon={IconTrophy}
            tone="warning"
          />
        </div>
      </section>

      <section id="leaderboard" className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold tracking-tight text-text-1 sm:text-2xl">{t("leaderboard.heading")}</h2>
          <p className="mt-1.5 text-sm text-text-2">{t("leaderboard.subtitle")}</p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
            <IconTrophy size={32} stroke={1.5} className="text-text-3" />
            <p className="text-sm font-semibold text-text-1">{t("leaderboard.empty")}</p>
          </div>
        ) : (
          <div className="stagger-fade space-y-2.5">
            {leaderboard.map((row, index) => {
              const percent = row.template_max_score > 0 ? (row.total_score / row.template_max_score) * 100 : 0;
              const podium = RANK_META[index];
              const RankIcon = podium?.icon;
              return (
                <div
                  key={`${row.full_name}-${index}`}
                  className={`flex flex-wrap items-center gap-4 rounded-xl border bg-surface p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                    podium ? `border-transparent ${podium.ring}` : "border-border"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      podium ? podium.tone : "bg-surface-alt text-text-2"
                    }`}
                  >
                    {RankIcon ? <RankIcon size={17} stroke={1.75} /> : index + 1}
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-bold text-accent">
                    {row.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-[10rem] flex-1">
                    <p className="text-sm font-semibold text-text-1">{row.full_name}</p>
                    <p className="text-xs text-text-3">{row.department_name ?? "—"}</p>
                  </div>
                  <div className="flex min-w-[10rem] flex-1 items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-alt">
                      <div
                        className={`h-full rounded-full transition-[width] duration-700 ease-out ${podium ? "bg-gradient-to-r from-accent to-[#3646c9]" : "bg-accent"}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right text-sm font-bold text-text-1 tabular-nums">
                      {row.total_score} <span className="font-normal text-text-3">/ {row.template_max_score}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="border-t border-border px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-text-3">
            {brandName} · {t("footer.internal")}
          </p>
          <p className="text-xs text-text-3">
            © {new Date().getFullYear()} {brandName} — {t("footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
}

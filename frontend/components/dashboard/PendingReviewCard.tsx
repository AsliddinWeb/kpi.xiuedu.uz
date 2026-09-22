import { IconArrowRight, IconFileCheck } from "@tabler/icons-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getArizalar } from "@/lib/arizalar";

export default async function PendingReviewCard({ locale }: { locale: string }) {
  const t = await getTranslations("dashboard");
  const arizaT = await getTranslations("arizalar");
  const items = await getArizalar(locale, { status: "submitted" });

  return (
    <Link
      href="/dashboard/arizalar"
      className="group relative flex animate-fade-up items-center justify-between overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-warning via-warning/60 to-transparent" aria-hidden />
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-warning to-[#b17e00] text-white shadow-[0_4px_10px_-2px_rgba(224,161,0,0.4)] transition-transform duration-200 group-hover:scale-105">
          <IconFileCheck size={19} stroke={1.75} />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-1">{t("pendingReview", { count: items.length })}</p>
          <p className="text-xs text-text-3">{arizaT("heading")}</p>
        </div>
      </div>
      <IconArrowRight
        size={18}
        stroke={2}
        className="text-text-3 transition-transform group-hover:translate-x-1 group-hover:text-accent"
      />
    </Link>
  );
}

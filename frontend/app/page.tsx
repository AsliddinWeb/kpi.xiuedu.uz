import { getLocale } from "next-intl/server";
import PublicHome from "@/components/home/PublicHome";
import { getMe } from "@/lib/auth";
import { getCompanySettings } from "@/lib/company";
import { getPublicLeaderboard, getPublicStats } from "@/lib/public";
import { resolveTheme } from "@/lib/theme";

export default async function Home() {
  const locale = await getLocale();
  const user = await getMe(locale);

  const theme = resolveTheme(user);
  const [company, stats, leaderboard] = await Promise.all([
    getCompanySettings(locale),
    getPublicStats(locale),
    getPublicLeaderboard(locale),
  ]);

  return (
    <PublicHome
      theme={theme}
      company={company}
      stats={stats}
      leaderboard={leaderboard}
      authenticated={Boolean(user)}
    />
  );
}

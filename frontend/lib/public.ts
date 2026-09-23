import { cache } from "react";

export type PublicLeaderboardRow = {
  full_name: string;
  department_name: string | null;
  total_score: number;
  template_max_score: number;
};

export type PublicStats = {
  total_employees: number;
  total_departments: number;
  average_score: number | null;
  top_score: number | null;
  academic_year: string | null;
};

function internalUrl() {
  return process.env.INTERNAL_API_URL ?? "http://backend:8000";
}

export const getPublicLeaderboard = cache(async (locale: string): Promise<PublicLeaderboardRow[]> => {
  const res = await fetch(`${internalUrl()}/api/v1/public/leaderboard`, {
    headers: { "Accept-Language": locale },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
});

export const getPublicStats = cache(async (locale: string): Promise<PublicStats | null> => {
  const res = await fetch(`${internalUrl()}/api/v1/public/stats`, {
    headers: { "Accept-Language": locale },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
});

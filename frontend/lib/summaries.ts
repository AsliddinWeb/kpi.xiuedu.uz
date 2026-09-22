import { cookies } from "next/headers";
import { cache } from "react";

export type SummaryType = "semester_review" | "year_end" | "early_warning";

export type Summary = {
  id: number;
  type: SummaryType;
  period: string;
  half: number | null;
  generated_by_id: number;
  generated_by_name: string;
  generated_at: string;
  payload: Record<string, unknown>;
};

function internalUrl() {
  return process.env.INTERNAL_API_URL ?? "http://backend:8000";
}

export const getSummaries = cache(async (locale: string, type?: SummaryType): Promise<Summary[]> => {
  const cookieStore = cookies();
  const query = type ? `?type=${type}` : "";
  const res = await fetch(`${internalUrl()}/api/v1/summaries${query}`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
});

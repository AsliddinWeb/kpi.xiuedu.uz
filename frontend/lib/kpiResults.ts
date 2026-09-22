import { cookies } from "next/headers";
import { cache } from "react";

export type KpiResult = {
  id: number;
  user_id: number;
  kpi_template_id: number;
  period: string;
  total_score: number;
  category_breakdown: Record<string, number>;
  status: "computed" | "approved";
  approved_at: string | null;
  computed_at: string;
};

export const getMyKpiResults = cache(async (locale: string, userId: number): Promise<KpiResult[]> => {
  const cookieStore = cookies();
  const internalApiUrl = process.env.INTERNAL_API_URL ?? "http://backend:8000";

  const res = await fetch(`${internalApiUrl}/api/v1/kpi-results?user_id=${userId}`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });

  if (!res.ok) return [];
  return res.json();
});

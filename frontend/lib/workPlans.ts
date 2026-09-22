import { cookies } from "next/headers";
import { cache } from "react";

export type WorkPlanItemFulfillment = {
  kpi_indicator_id: number;
  indicator_name: string;
  planned_count: number;
  planned_score: number | null;
  notes: string | null;
  actual_count: number;
  actual_score: number;
  classification: "under" | "met" | "exceeded";
};

export type WorkPlan = {
  id: number;
  user_id: number;
  user_full_name: string;
  period: string;
  status: "active" | "closed";
  created_at: string;
  items: WorkPlanItemFulfillment[];
};

function internalUrl() {
  return process.env.INTERNAL_API_URL ?? "http://backend:8000";
}

export const getWorkPlans = cache(async (locale: string, userId?: number, period?: string): Promise<WorkPlan[]> => {
  const cookieStore = cookies();
  const params = new URLSearchParams();
  if (userId) params.set("user_id", String(userId));
  if (period) params.set("period", period);
  const query = params.toString() ? `?${params.toString()}` : "";

  const res = await fetch(`${internalUrl()}/api/v1/work-plans${query}`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });

  if (!res.ok) return [];
  return res.json();
});

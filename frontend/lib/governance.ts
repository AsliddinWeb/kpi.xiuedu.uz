import { cookies } from "next/headers";
import { cache } from "react";

export type CorrectionPlan = {
  id: number;
  user_id: number;
  user_full_name: string;
  period: string;
  stage: "load_reduction" | "warning" | "termination";
  reason: string;
  load_reduction_percent: number | null;
  status: "active" | "resolved";
  started_by_id: number;
  started_at: string;
  resolved_at: string | null;
};

export type ForceMajeureDeclaration = {
  id: number;
  declared_by_id: number;
  affected_user_id: number | null;
  period: string;
  category: string;
  description: string;
  extension_days: number;
  status: "pending" | "acknowledged" | "resolved";
  started_at: string;
  resolved_at: string | null;
};

export type Incentive = {
  id: number;
  user_id: number;
  user_full_name: string;
  period: string;
  type: "monetary" | "title" | "certificate" | "training_trip" | "other";
  title: string;
  description: string | null;
  amount: number | null;
  decided_by_id: number;
  decided_at: string;
  status: "active" | "revoked";
  revoked_at: string | null;
  revoked_reason: string | null;
};

function internalUrl() {
  return process.env.INTERNAL_API_URL ?? "http://backend:8000";
}

export const getCorrectionPlans = cache(async (locale: string): Promise<CorrectionPlan[]> => {
  const cookieStore = cookies();
  const res = await fetch(`${internalUrl()}/api/v1/correction-plans`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
});

export const getForceMajeureDeclarations = cache(async (locale: string): Promise<ForceMajeureDeclaration[]> => {
  const cookieStore = cookies();
  const res = await fetch(`${internalUrl()}/api/v1/force-majeure`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
});

export const getIncentives = cache(async (locale: string): Promise<Incentive[]> => {
  const cookieStore = cookies();
  const res = await fetch(`${internalUrl()}/api/v1/incentives`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
});

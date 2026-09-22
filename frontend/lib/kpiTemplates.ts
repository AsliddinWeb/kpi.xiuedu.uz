import { cookies } from "next/headers";
import { cache } from "react";

export type KpiIndicatorSubItem = {
  id: number;
  label: string;
  max_score: number;
  order_index: number;
};

export type KpiIndicator = {
  id: number;
  kpi_category_id: number;
  name: string;
  description: string | null;
  max_score: number;
  allow_coauthors: boolean;
  requires_file: boolean;
  order_index: number;
  sub_items: KpiIndicatorSubItem[];
};

export type KpiCategory = {
  id: number;
  kpi_template_id: number;
  name: string;
  max_score: number;
  is_bonus_category: boolean;
  requires_kafedra_endorsement: boolean;
  requires_head_approval: boolean;
  order_index: number;
  indicators: KpiIndicator[];
};

export type KpiTemplate = {
  id: number;
  name: string;
  annex_code: string;
  academic_year: string;
  period_type: "monthly" | "quarterly" | "yearly";
  is_active: boolean;
  total_max_score: number;
  categories: KpiCategory[];
};

function internalUrl() {
  return process.env.INTERNAL_API_URL ?? "http://backend:8000";
}

export const getKpiTemplates = cache(async (locale: string): Promise<KpiTemplate[]> => {
  const cookieStore = cookies();

  const res = await fetch(`${internalUrl()}/api/v1/kpi-templates`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });

  if (!res.ok) return [];
  return res.json();
});

export const getKpiTemplate = cache(async (locale: string, id: number): Promise<KpiTemplate | null> => {
  const cookieStore = cookies();

  const res = await fetch(`${internalUrl()}/api/v1/kpi-templates/${id}`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
});

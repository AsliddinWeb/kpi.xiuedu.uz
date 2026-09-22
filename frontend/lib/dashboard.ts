import { cookies } from "next/headers";
import { cache } from "react";

export type TeamMember = {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  latest_period: string | null;
  latest_status: string | null;
  latest_score: number | null;
};

export type OrganizationSummary = {
  total_employees: number;
  total_departments: number;
  total_positions: number;
  results_computed: number;
  results_approved: number;
  average_score: number | null;
};

export type DepartmentComparisonRow = {
  department_id: number;
  department_name: string;
  employee_count: number;
  average_score: number | null;
};

export type RectorSummary = {
  pending_head_approvals: number;
  active_correction_plans: number;
  active_force_majeure: number;
  total_employees: number;
  organization_average_score: number | null;
};

export type LeaderboardRow = {
  user_id: number;
  full_name: string;
  department_name: string | null;
  position_title: string | null;
  total_score: number;
  template_max_score: number;
};

export type MyKpiSubmissionRow = {
  ariza_id: number;
  status: string;
  awarded_score: number | null;
  employee_comment: string | null;
  reviewer_comment: string | null;
  submitted_at: string;
};

export type MyKpiIndicatorRow = {
  kpi_indicator_id: number;
  indicator_name: string;
  category_id: number;
  category_name: string;
  category_max_score: number;
  max_score: number;
  awarded_total: number;
  remaining_capacity: number;
  submissions: MyKpiSubmissionRow[];
};

function internalUrl() {
  return process.env.INTERNAL_API_URL ?? "http://backend:8000";
}

export const getTeamSummary = cache(async (locale: string, period?: string): Promise<TeamMember[]> => {
  const cookieStore = cookies();
  const query = period ? `?period=${period}` : "";
  const res = await fetch(`${internalUrl()}/api/v1/dashboard/team-summary${query}`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
});

export const getOrganizationSummary = cache(
  async (locale: string, period?: string): Promise<OrganizationSummary | null> => {
    const cookieStore = cookies();
    const query = period ? `?period=${period}` : "";
    const res = await fetch(`${internalUrl()}/api/v1/dashboard/organization-summary${query}`, {
      headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  },
);

export const getRectorSummary = cache(async (locale: string): Promise<RectorSummary | null> => {
  const cookieStore = cookies();
  const res = await fetch(`${internalUrl()}/api/v1/dashboard/rector-summary`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
});

export const getDepartmentComparison = cache(async (locale: string, period?: string): Promise<DepartmentComparisonRow[]> => {
  const cookieStore = cookies();
  const query = period ? `?period=${period}` : "";
  const res = await fetch(`${internalUrl()}/api/v1/dashboard/department-comparison${query}`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
});

export const getLeaderboard = cache(
  async (locale: string, kpiTemplateId: number, period: string): Promise<LeaderboardRow[]> => {
    const cookieStore = cookies();
    const res = await fetch(
      `${internalUrl()}/api/v1/dashboard/leaderboard?kpi_template_id=${kpiTemplateId}&period=${period}`,
      {
        headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    return res.json();
  },
);

export const getMyKpi = cache(
  async (locale: string, period: string, userId?: number): Promise<MyKpiIndicatorRow[]> => {
    const cookieStore = cookies();
    const query = userId ? `period=${period}&user_id=${userId}` : `period=${period}`;
    const res = await fetch(`${internalUrl()}/api/v1/dashboard/my-kpi?${query}`, {
      headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  },
);

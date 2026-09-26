import { cookies } from "next/headers";
import { cache } from "react";

export type Employee = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  auth_provider: "local" | "hemis" | string;
  manager_id: number | null;
  department_id: number | null;
  position_id: number | null;
  kpi_template_id: number | null;
  academic_degree: AcademicDegree;
  bonus_fund_override: number | null;
  is_active: boolean;
  is_restricted: boolean;
  theme_preference: string;
  last_login_at: string | null;

  // HEMIS OAuth (synced on that person's own HEMIS login)
  hemis_login: string | null;
  hemis_phone: string | null;
  hemis_type: string | null;
  hemis_birth_date: string | null;
  hemis_picture_url: string | null;
  hemis_last_synced_at: string | null;

  // HEMIS REST API (admin-triggered resync, works without that person logging in)
  hemis_employee_id_number: string | null;
  hemis_image_url: string | null;
  hemis_academic_degree_name: string | null;
  hemis_academic_rank_name: string | null;
  hemis_staff_position_name: string | null;
  hemis_employment_status_name: string | null;
  hemis_department_name: string | null;
  hemis_rest_synced_at: string | null;
};

export type AcademicDegree = "none" | "phd" | "dsc" | "dotsent" | "professor";

function internalUrl() {
  return process.env.INTERNAL_API_URL ?? "http://backend:8000";
}

export const getEmployees = cache(async (locale: string, facultyId?: number): Promise<Employee[]> => {
  const cookieStore = cookies();

  const url = facultyId
    ? `${internalUrl()}/api/v1/users?faculty_id=${facultyId}`
    : `${internalUrl()}/api/v1/users`;
  const res = await fetch(url, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });

  if (!res.ok) return [];
  return res.json();
});

export const getEmployee = cache(async (locale: string, id: number): Promise<Employee | null> => {
  const cookieStore = cookies();

  const res = await fetch(`${internalUrl()}/api/v1/users/${id}`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
});

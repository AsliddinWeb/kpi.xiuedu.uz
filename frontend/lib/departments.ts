import { cookies } from "next/headers";
import { cache } from "react";

export type Position = {
  id: number;
  department_id: number;
  title: string;
  bonus_fund: number | null;
  minimal_score: number | null;
  inherited_from_department_id: number | null;
};

export type DepartmentType = "faculty" | "kafedra" | "administrative";

export type Department = {
  id: number;
  name: string;
  department_type: DepartmentType;
  parent_department_id: number | null;
  positions: Position[];
};

function internalUrl() {
  return process.env.INTERNAL_API_URL ?? "http://backend:8000";
}

export const getDepartments = cache(async (locale: string): Promise<Department[]> => {
  const cookieStore = cookies();
  const res = await fetch(`${internalUrl()}/api/v1/departments`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });

  if (!res.ok) return [];
  return res.json();
});

export const getDepartment = cache(async (locale: string, id: number): Promise<Department | null> => {
  const cookieStore = cookies();
  const res = await fetch(`${internalUrl()}/api/v1/departments/${id}`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
});

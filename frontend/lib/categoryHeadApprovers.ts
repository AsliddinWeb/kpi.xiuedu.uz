import { cookies } from "next/headers";
import { cache } from "react";

export type CategoryHeadApprover = {
  id: number;
  kpi_category_id: number;
  category_name: string;
  kpi_indicator_id: number | null;
  indicator_name: string | null;
  user_id: number;
  user_full_name: string;
};

export const getCategoryHeadApprovers = cache(async (locale: string): Promise<CategoryHeadApprover[]> => {
  const cookieStore = cookies();
  const internalApiUrl = process.env.INTERNAL_API_URL ?? "http://backend:8000";

  const res = await fetch(`${internalApiUrl}/api/v1/category-head-approvers`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });

  if (!res.ok) return [];
  return res.json();
});

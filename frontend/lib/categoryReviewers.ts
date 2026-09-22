import { cookies } from "next/headers";
import { cache } from "react";

export type CategoryReviewer = {
  id: number;
  kpi_category_id: number;
  category_name: string;
  user_id: number;
  user_full_name: string;
};

export const getCategoryReviewers = cache(async (locale: string): Promise<CategoryReviewer[]> => {
  const cookieStore = cookies();
  const internalApiUrl = process.env.INTERNAL_API_URL ?? "http://backend:8000";

  const res = await fetch(`${internalApiUrl}/api/v1/category-reviewers`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });

  if (!res.ok) return [];
  return res.json();
});

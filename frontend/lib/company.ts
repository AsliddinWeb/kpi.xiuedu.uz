import { cookies } from "next/headers";
import { cache } from "react";

export type CompanySettings = {
  id: number;
  name: string;
  logo_url: string | null;
  industry_label: string | null;
  default_period_type: "monthly" | "quarterly" | "yearly";
  setup_completed_at: string | null;
};

export const getCompanySettings = cache(async (locale: string): Promise<CompanySettings | null> => {
  const cookieStore = cookies();
  const internalApiUrl = process.env.INTERNAL_API_URL ?? "http://backend:8000";

  const res = await fetch(`${internalApiUrl}/api/v1/setup/company`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
});

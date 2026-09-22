import { cookies } from "next/headers";
import { cache } from "react";

export type Me = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  auth_provider: "local" | "hemis" | string;
  kpi_template_id: number | null;
  academic_degree: "none" | "phd" | "dsc" | "dotsent" | "professor";
  theme_preference: "light" | "dark" | string;
  sidebar_collapsed: boolean;
};

export const getMe = cache(async (locale: string): Promise<Me | null> => {
  const cookieStore = cookies();
  const internalApiUrl = process.env.INTERNAL_API_URL ?? "http://backend:8000";

  const res = await fetch(`${internalApiUrl}/api/v1/auth/me`, {
    headers: {
      cookie: cookieStore.toString(),
      "Accept-Language": locale,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
});

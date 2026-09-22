import { cookies } from "next/headers";
import { cache } from "react";

export type PayrollExport = {
  id: number;
  period: string;
  status: "pending" | "completed" | "failed";
  format: "xlsx" | "pdf";
  file_url: string | null;
  generated_at: string | null;
};

export const getExports = cache(async (locale: string): Promise<PayrollExport[]> => {
  const cookieStore = cookies();
  const internalApiUrl = process.env.INTERNAL_API_URL ?? "http://backend:8000";

  const res = await fetch(`${internalApiUrl}/api/v1/exports`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });

  if (!res.ok) return [];
  return res.json();
});

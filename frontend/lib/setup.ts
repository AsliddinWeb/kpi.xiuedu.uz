import { cache } from "react";

export type SetupStatus = {
  setup_completed: boolean;
};

export const getSetupStatus = cache(async (locale: string): Promise<SetupStatus> => {
  const internalApiUrl = process.env.INTERNAL_API_URL ?? "http://backend:8000";

  const res = await fetch(`${internalApiUrl}/api/v1/setup/status`, {
    headers: { "Accept-Language": locale },
    cache: "no-store",
  });

  if (!res.ok) return { setup_completed: false };
  return res.json();
});

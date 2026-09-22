import { cookies } from "next/headers";

export type AuditLogEntry = {
  id: number;
  user_id: number | null;
  user_full_name: string | null;
  action: string;
  entity: string;
  entity_id: number | null;
  created_at: string;
};

export type AuditLogPage = {
  total: number;
  items: AuditLogEntry[];
};

export async function getAuditLog(
  locale: string,
  limit = 20,
  offset = 0,
  filters: { action?: string; entity?: string; userId?: string } = {},
): Promise<AuditLogPage> {
  const cookieStore = cookies();
  const internalApiUrl = process.env.INTERNAL_API_URL ?? "http://backend:8000";

  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (filters.action) query.set("action", filters.action);
  if (filters.entity) query.set("entity", filters.entity);
  if (filters.userId) query.set("user_id", filters.userId);

  const res = await fetch(`${internalApiUrl}/api/v1/audit-log?${query.toString()}`, {
    headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
    cache: "no-store",
  });

  if (!res.ok) return { total: 0, items: [] };
  return res.json();
}

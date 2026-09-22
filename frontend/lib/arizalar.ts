import { cookies } from "next/headers";
import { cache } from "react";

export type ArizaFile = {
  id: number;
  file_url: string;
  original_filename: string;
  uploaded_at: string;
};

export type ArizaCoAuthor = {
  id: number;
  co_author_user_id: number | null;
  co_author_name: string | null;
  share_percent: number;
};

export type ArizaStatus =
  | "submitted"
  | "kafedra_endorsed"
  | "scored"
  | "pending_head_approval"
  | "approved"
  | "rejected";

export type Ariza = {
  id: number;
  user_id: number;
  user_full_name: string;
  kpi_indicator_id: number;
  indicator_name: string;
  kpi_category_id: number;
  category_name: string;
  requires_kafedra_endorsement: boolean;
  requires_head_approval: boolean;
  max_score: number;
  period: string;
  status: ArizaStatus;
  employee_comment: string | null;
  awarded_score: number | null;
  reviewer_id: number | null;
  reviewer_comment: string | null;
  head_approved_by_id: number | null;
  head_approved_at: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  files: ArizaFile[];
  co_authors: ArizaCoAuthor[];
};

function internalUrl() {
  return process.env.INTERNAL_API_URL ?? "http://backend:8000";
}

export const getArizalar = cache(
  async (
    locale: string,
    params: { userId?: number; status?: string; period?: string } = {},
  ): Promise<Ariza[]> => {
    const cookieStore = cookies();
    const query = new URLSearchParams();
    if (params.userId != null) query.set("user_id", String(params.userId));
    if (params.status) query.set("status_filter", params.status);
    if (params.period) query.set("period", params.period);

    const res = await fetch(`${internalUrl()}/api/v1/arizalar?${query.toString()}`, {
      headers: { cookie: cookieStore.toString(), "Accept-Language": locale },
      cache: "no-store",
    });

    if (!res.ok) return [];
    return res.json();
  },
);

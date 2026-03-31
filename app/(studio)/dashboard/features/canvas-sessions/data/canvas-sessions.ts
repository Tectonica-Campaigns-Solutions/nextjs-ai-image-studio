import { createClient } from "@/lib/supabase/server";
import type { CanvasSessionSummary } from "@/app/(studio)/dashboard/utils/types";
import { createNameMap } from "@/app/(studio)/dashboard/utils/data-utils";

export interface CanvasSessionsPageData {
  sessions: CanvasSessionSummary[];
  totalSessions: number;
  clientNames: Record<string, string>;
}

export async function getCanvasSessionsPageData(
  limit = 500,
): Promise<CanvasSessionsPageData | null> {
  const supabase = await createClient();

  const [{ data, count, error }, clientsRes] = await Promise.all([
    supabase
      .from("client_canvas_sessions")
      .select(
        "id, client_id, ca_user_id, name, thumbnail_url, background_url, created_at, updated_at",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase.from("clients").select("id, name").is("deleted_at", null),
  ]);

  if (error || !data) return null;

  return {
    sessions: data as CanvasSessionSummary[],
    totalSessions: count ?? 0,
    clientNames: createNameMap(clientsRes.data ?? []),
  };
}

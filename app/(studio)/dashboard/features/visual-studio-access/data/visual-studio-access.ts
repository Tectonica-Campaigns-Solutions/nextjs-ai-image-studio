import { createClient } from "@/lib/supabase/server";

export interface VisualStudioAccessLogEntry {
  id: string;
  caUserId: string;
  browser: string | null;
  path: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface VisualStudioAccessLogFilters {
  caUserId?: string;
  browser?: string;
  from?: string;
  to?: string;
}

export async function getVisualStudioAccessLogData(
  filters: VisualStudioAccessLogFilters = {},
): Promise<VisualStudioAccessLogEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from("client_visual_studio_access_logs")
    .select("id, ca_user_id, browser, path, ip_address, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.caUserId) {
    query = query.eq("ca_user_id", filters.caUserId);
  }
  if (filters.browser && filters.browser !== "all") {
    query = query.eq("browser", filters.browser);
  }
  if (filters.from) {
    query = query.gte("created_at", filters.from);
  }
  if (filters.to) {
    query = query.lte("created_at", filters.to);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as any[]).map((row) => ({
    id: row.id,
    caUserId: row.ca_user_id,
    browser: row.browser ?? null,
    path: row.path ?? null,
    ipAddress: row.ip_address ?? null,
    createdAt: row.created_at,
  }));
}


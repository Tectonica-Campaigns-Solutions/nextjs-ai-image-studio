import { createClient } from "@/lib/supabase/server";

export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalAssets: number;
  totalFonts: number;
  totalCanvasSessions: number;
}

export interface RecentClient {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface DashboardOverviewData {
  stats: DashboardStats;
  recentClients: RecentClient[];
}

export async function getDashboardOverviewData(): Promise<DashboardOverviewData | null> {
  const supabase = await createClient();

  const [clientsRes, assetsRes, fontsRes, sessionsRes, recentRes] =
    await Promise.all([
      supabase
        .from("clients")
        .select("is_active", { count: "exact", head: false })
        .is("deleted_at", null),
      supabase
        .from("client_assets")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      supabase
        .from("client_fonts")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      supabase
        .from("client_canvas_sessions")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      supabase
        .from("clients")
        .select("id, name, is_active, created_at, updated_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  if (clientsRes.error) return null;

  const clients = clientsRes.data ?? [];
  const activeClients = clients.filter((c) => c.is_active).length;

  return {
    stats: {
      totalClients: clients.length,
      activeClients,
      inactiveClients: clients.length - activeClients,
      totalAssets: assetsRes.count ?? 0,
      totalFonts: fontsRes.count ?? 0,
      totalCanvasSessions: sessionsRes.count ?? 0,
    },
    recentClients: (recentRes.data ?? []) as RecentClient[],
  };
}

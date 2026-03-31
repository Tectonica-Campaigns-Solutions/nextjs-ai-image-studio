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

export interface DashboardTrendSeries {
  dates: string[];
  assets: number[];
  fonts: number[];
  sessions: number[];
}

export interface ActivityItem {
  id: string;
  type: "client_created" | "client_activated" | "asset_uploaded" | "font_added" | "session_started";
  title: string;
  timestamp: string;
  active: boolean;
}

export interface DashboardOverviewData {
  stats: DashboardStats;
  recentClients: RecentClient[];
  trends: DashboardTrendSeries;
  activity: ActivityItem[];
}

export async function getDashboardOverviewData(): Promise<DashboardOverviewData | null> {
  const supabase = await createClient();

  const trendDays = 30;
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (trendDays - 1));
  const dayKeys: string[] = Array.from({ length: trendDays }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const startISO = new Date(`${dayKeys[0]}T00:00:00.000Z`).toISOString();
  const endExclusive = new Date(end);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const endISO = endExclusive.toISOString();
  const keyToIndex = new Map(dayKeys.map((k, i) => [k, i]));

  const [clientsRes, assetsRes, fontsRes, sessionsRes, recentRes, assetsTrendRes, fontsTrendRes, sessionsTrendRes, recentAssetsRes, recentFontsRes, recentSessionsRes] =
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
      supabase
        .from("client_assets")
        .select("created_at")
        .gte("created_at", startISO)
        .lt("created_at", endISO)
        .is("deleted_at", null),
      supabase
        .from("client_fonts")
        .select("created_at")
        .gte("created_at", startISO)
        .lt("created_at", endISO)
        .is("deleted_at", null),
      supabase
        .from("client_canvas_sessions")
        .select("created_at")
        .gte("created_at", startISO)
        .lt("created_at", endISO)
        .is("deleted_at", null),
      supabase
        .from("client_assets")
        .select("id, created_at, client_id, clients(name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("client_fonts")
        .select("id, created_at, client_id, clients(name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("client_canvas_sessions")
        .select("id, created_at, client_id, clients(name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

  if (clientsRes.error) return null;

  const clients = clientsRes.data ?? [];
  const activeClients = clients.filter((c) => c.is_active).length;

  const assetsTrend = Array.from({ length: trendDays }, () => 0);
  const fontsTrend = Array.from({ length: trendDays }, () => 0);
  const sessionsTrend = Array.from({ length: trendDays }, () => 0);

  if (!assetsTrendRes.error) {
    for (const row of (assetsTrendRes.data ?? []) as Array<{ created_at: string }>) {
      const key = row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : null;
      if (!key) continue;
      const idx = keyToIndex.get(key);
      if (idx !== undefined) assetsTrend[idx] += 1;
    }
  }
  if (!fontsTrendRes.error) {
    for (const row of (fontsTrendRes.data ?? []) as Array<{ created_at: string }>) {
      const key = row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : null;
      if (!key) continue;
      const idx = keyToIndex.get(key);
      if (idx !== undefined) fontsTrend[idx] += 1;
    }
  }
  if (!sessionsTrendRes.error) {
    for (const row of (sessionsTrendRes.data ?? []) as Array<{ created_at: string }>) {
      const key = row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : null;
      if (!key) continue;
      const idx = keyToIndex.get(key);
      if (idx !== undefined) sessionsTrend[idx] += 1;
    }
  }

  const activity: ActivityItem[] = [];

  for (const c of (recentRes.data ?? []) as RecentClient[]) {
    activity.push({
      id: `client-${c.id}`,
      type: c.is_active ? "client_activated" : "client_created",
      title: c.is_active ? `Client activated: ${c.name}` : `Client created: ${c.name}`,
      timestamp: c.updated_at ?? c.created_at,
      active: c.is_active,
    });
  }

  for (const a of (recentAssetsRes.data ?? []) as unknown as Array<{ id: string; created_at: string; clients: { name: string } | null }>) {
    const clientName = a.clients?.name ?? "Unknown";
    activity.push({
      id: `asset-${a.id}`,
      type: "asset_uploaded",
      title: `Asset uploaded for ${clientName}`,
      timestamp: a.created_at,
      active: true,
    });
  }

  for (const f of (recentFontsRes.data ?? []) as unknown as Array<{ id: string; created_at: string; clients: { name: string } | null }>) {
    const clientName = f.clients?.name ?? "Unknown";
    activity.push({
      id: `font-${f.id}`,
      type: "font_added",
      title: `Font added for ${clientName}`,
      timestamp: f.created_at,
      active: true,
    });
  }

  for (const s of (recentSessionsRes.data ?? []) as unknown as Array<{ id: string; created_at: string; clients: { name: string } | null }>) {
    const clientName = s.clients?.name ?? "Unknown";
    activity.push({
      id: `session-${s.id}`,
      type: "session_started",
      title: `Canvas session for ${clientName}`,
      timestamp: s.created_at,
      active: true,
    });
  }

  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
    trends: {
      dates: dayKeys,
      assets: assetsTrend,
      fonts: fontsTrend,
      sessions: sessionsTrend,
    },
    activity: activity.slice(0, 8),
  };
}


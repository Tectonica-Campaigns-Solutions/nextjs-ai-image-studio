import { createClient } from "@/lib/supabase/server";

export interface AuditEntry {
  id: string;
  type: "client" | "asset" | "font" | "session";
  action: "created" | "updated" | "deleted";
  entityName: string;
  clientName: string | null;
  timestamp: string;
}

export async function getAuditLogData(): Promise<AuditEntry[]> {
  const supabase = await createClient();

  const [clientsRes, assetsRes, fontsRes, sessionsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, created_at, updated_at, deleted_at")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("client_assets")
      .select("id, created_at, deleted_at, client_id, clients(name)")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("client_fonts")
      .select("id, created_at, deleted_at, client_id, clients(name)")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("client_canvas_sessions")
      .select("id, created_at, deleted_at, client_id, clients(name)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const entries: AuditEntry[] = [];

  for (const c of (clientsRes.data ?? []) as Array<{ id: string; name: string; created_at: string; updated_at: string | null; deleted_at: string | null }>) {
    const action = c.deleted_at ? "deleted" : c.updated_at && c.updated_at !== c.created_at ? "updated" : "created";
    entries.push({
      id: `client-${c.id}-${action}`,
      type: "client",
      action,
      entityName: c.name,
      clientName: null,
      timestamp: c.deleted_at ?? c.updated_at ?? c.created_at,
    });
  }

  for (const a of (assetsRes.data ?? []) as unknown as Array<{ id: string; created_at: string; deleted_at: string | null; clients: { name: string } | null }>) {
    const action = a.deleted_at ? "deleted" : "created";
    entries.push({
      id: `asset-${a.id}-${action}`,
      type: "asset",
      action,
      entityName: "Asset",
      clientName: a.clients?.name ?? null,
      timestamp: a.deleted_at ?? a.created_at,
    });
  }

  for (const f of (fontsRes.data ?? []) as unknown as Array<{ id: string; created_at: string; deleted_at: string | null; clients: { name: string } | null }>) {
    const action = f.deleted_at ? "deleted" : "created";
    entries.push({
      id: `font-${f.id}-${action}`,
      type: "font",
      action,
      entityName: "Font",
      clientName: f.clients?.name ?? null,
      timestamp: f.deleted_at ?? f.created_at,
    });
  }

  for (const s of (sessionsRes.data ?? []) as unknown as Array<{ id: string; created_at: string; deleted_at: string | null; clients: { name: string } | null }>) {
    const action = s.deleted_at ? "deleted" : "created";
    entries.push({
      id: `session-${s.id}-${action}`,
      type: "session",
      action,
      entityName: "Canvas Session",
      clientName: s.clients?.name ?? null,
      timestamp: s.deleted_at ?? s.created_at,
    });
  }

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return entries.slice(0, 50);
}

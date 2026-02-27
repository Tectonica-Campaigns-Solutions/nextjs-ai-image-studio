import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import type {
  Client,
  ClientAsset,
  ClientFont,
  CanvasSessionSummary,
} from "@/app/(studio)/dashboard/types";

export async function getClients(caUserId?: string): Promise<Client[] | null> {
  const check = await requireAdmin();
  if (!check.success) return null;
  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (caUserId) query = query.eq("ca_user_id", caUserId);
  const { data, error } = await query;
  if (error) return null;
  return (data ?? []) as Client[];
}

export async function getClientById(id: string): Promise<Client | null> {
  const check = await requireAdmin();
  if (!check.success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error || !data) return null;
  return data as Client;
}

export async function getClientAssets(
  clientId: string,
  assetType?: string
): Promise<ClientAsset[] | null> {
  const check = await requireAdmin();
  if (!check.success) return null;
  const supabase = await createClient();
  let query = supabase
    .from("client_assets")
    .select("*")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (assetType) query = query.eq("asset_type", assetType);
  const { data, error } = await query;
  if (error) return null;
  return (data ?? []) as ClientAsset[];
}

export async function getClientFonts(
  clientId: string
): Promise<ClientFont[] | null> {
  const check = await requireAdmin();
  if (!check.success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_fonts")
    .select("*")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return null;
  return (data ?? []) as ClientFont[];
}

export async function getClientCanvasSessions(
  clientId: string
): Promise<CanvasSessionSummary[] | null> {
  const check = await requireAdmin();
  if (!check.success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_canvas_sessions")
    .select("id, client_id, ca_user_id, name, thumbnail_url, background_url, created_at, updated_at")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) return null;
  return (data ?? []) as CanvasSessionSummary[];
}

export async function getClientVariants(
  clientId: string
): Promise<string[] | null> {
  const check = await requireAdmin();
  if (!check.success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_assets")
    .select("variant")
    .eq("client_id", clientId)
    .eq("asset_type", "logo")
    .not("variant", "is", null)
    .is("deleted_at", null);
  if (error) return null;
  const variants = Array.from(
    new Set(
      (data ?? []).map((r) => r.variant).filter((v): v is string => v != null)
    )
  ).sort();
  return variants;
}

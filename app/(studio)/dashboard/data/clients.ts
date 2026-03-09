import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import type {
  Client,
  ClientAsset,
  ClientFont,
  CanvasSessionSummary,
} from "@/app/(studio)/dashboard/types";

/**
 * Fetches all clients. Does NOT call requireAdmin - the page must do that first.
 */
export async function getClientsListData(
  caUserId?: string
): Promise<Client[] | null> {
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

export async function getClients(caUserId?: string): Promise<Client[] | null> {
  const check = await requireAdmin();
  if (!check.success) return null;
  return getClientsListData(caUserId);
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

export interface ClientDetailPageData {
  client: Client | null;
  assets: ClientAsset[];
  frames: ClientAsset[];
  fonts: ClientFont[];
  variants: string[];
  canvasSessions: CanvasSessionSummary[];
}

export interface ClientDetailHeaderData {
  client: Client | null;
  variants: string[];
}

export interface ClientDetailGalleriesData {
  assets: ClientAsset[];
  frames: ClientAsset[];
  fonts: ClientFont[];
  canvasSessions: CanvasSessionSummary[];
}

/**
 * Fetches only client + variants for the header and form. Does NOT call requireAdmin.
 */
export async function getClientDetailHeaderData(
  clientId: string
): Promise<ClientDetailHeaderData> {
  const supabase = await createClient();
  const [clientRes, variantsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("client_assets")
      .select("variant")
      .eq("client_id", clientId)
      .eq("asset_type", "logo")
      .not("variant", "is", null)
      .is("deleted_at", null),
  ]);
  const variants = Array.from(
    new Set(
      (variantsRes.data ?? [])
        .map((r) => r.variant)
        .filter((v): v is string => v != null)
    )
  ).sort();
  return {
    client: clientRes.error || !clientRes.data ? null : (clientRes.data as Client),
    variants,
  };
}

/**
 * Cached fetcher for galleries data. Use in Suspense boundaries so multiple callers in the same request share one fetch.
 */
export const getClientDetailGalleriesDataCached = cache(
  async (clientId: string): Promise<ClientDetailGalleriesData> => {
    return getClientDetailGalleriesDataUncached(clientId);
  }
);

/**
 * Fetches assets, frames, fonts, and canvas sessions for the galleries. Does NOT call requireAdmin.
 */
async function getClientDetailGalleriesDataUncached(
  clientId: string
): Promise<ClientDetailGalleriesData> {
  const supabase = await createClient();
  const [assetsRes, framesRes, fontsRes, sessionsRes] = await Promise.all([
    supabase
      .from("client_assets")
      .select("*")
      .eq("client_id", clientId)
      .eq("asset_type", "logo")
      .is("deleted_at", null)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("client_assets")
      .select("*")
      .eq("client_id", clientId)
      .eq("asset_type", "frame")
      .is("deleted_at", null)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("client_fonts")
      .select("*")
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("client_canvas_sessions")
      .select("id, client_id, ca_user_id, name, thumbnail_url, background_url, created_at, updated_at")
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
  ]);
  return {
    assets: (assetsRes.data ?? []) as ClientAsset[],
    frames: (framesRes.data ?? []) as ClientAsset[],
    fonts: (fontsRes.data ?? []) as ClientFont[],
    canvasSessions: (sessionsRes.data ?? []) as CanvasSessionSummary[],
  };
}

/**
 * Fetches all data needed for the client detail page using a single Supabase client.
 * Does NOT call requireAdmin - the page must do that once before calling this.
 */
export async function getClientDetailPageData(
  clientId: string
): Promise<ClientDetailPageData> {
  const supabase = await createClient();

  const [clientRes, assetsRes, framesRes, fontsRes, variantsRes, sessionsRes] =
    await Promise.all([
      supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .is("deleted_at", null)
        .single(),
      supabase
        .from("client_assets")
        .select("*")
        .eq("client_id", clientId)
        .eq("asset_type", "logo")
        .is("deleted_at", null)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("client_assets")
        .select("*")
        .eq("client_id", clientId)
        .eq("asset_type", "frame")
        .is("deleted_at", null)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("client_fonts")
        .select("*")
        .eq("client_id", clientId)
        .is("deleted_at", null)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("client_assets")
        .select("variant")
        .eq("client_id", clientId)
        .eq("asset_type", "logo")
        .not("variant", "is", null)
        .is("deleted_at", null),
      supabase
        .from("client_canvas_sessions")
        .select("id, client_id, ca_user_id, name, thumbnail_url, background_url, created_at, updated_at")
        .eq("client_id", clientId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false }),
    ]);

  const variants = Array.from(
    new Set(
      (variantsRes.data ?? [])
        .map((r) => r.variant)
        .filter((v): v is string => v != null)
    )
  ).sort();

  return {
    client: clientRes.error || !clientRes.data ? null : (clientRes.data as Client),
    assets: (assetsRes.data ?? []) as ClientAsset[],
    frames: (framesRes.data ?? []) as ClientAsset[],
    fonts: (fontsRes.data ?? []) as ClientFont[],
    variants,
    canvasSessions: (sessionsRes.data ?? []) as CanvasSessionSummary[],
  };
}

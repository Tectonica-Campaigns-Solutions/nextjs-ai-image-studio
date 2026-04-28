import { createAdminClient, createClient } from "@/lib/supabase/server";
import type {
  Client,
  ClientAsset,
  ClientFont,
  CanvasSessionSummary,
  Plan,
} from "@/app/(studio)/dashboard/utils/types";

export interface PaginatedClients {
  clients: Client[];
  total: number;
}

/** Columns needed for the client list card view. */
const CLIENTS_LIST_SELECT =
  "id, name, ca_user_id, description, is_active, created_at, updated_at, plan_id";

/**
 * Escapes special characters for PostgreSQL ilike pattern (%, _, ').
 */
function escapeIlikePattern(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

export type ClientStatusFilter = "all" | "active" | "inactive";
export type ClientSortKey = "created" | "name" | "updated";

/**
 * Fetches clients with pagination, status filter, search, and sort.
 * Does NOT call requireAdmin - the page must do that first.
 */
export async function getClientsListData(
  options: {
    caUserId?: string;
    search?: string;
    status?: ClientStatusFilter;
    sort?: ClientSortKey;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<PaginatedClients | null> {
  const {
    caUserId,
    search,
    status = "all",
    sort = "created",
    page = 1,
    pageSize = 25,
  } = options;

  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("clients")
    .select(CLIENTS_LIST_SELECT, { count: "exact" })
    .is("deleted_at", null);

  if (caUserId) {
    query = query.eq("ca_user_id", caUserId);
  }

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    const pattern = `'%${escapeIlikePattern(trimmedSearch)}%'`;
    query = query.or(
      `name.ilike.${pattern},ca_user_id.ilike.${pattern},description.ilike.${pattern}`,
    );
  }

  if (sort === "name") {
    query = query.order("name", { ascending: true });
  } else if (sort === "updated") {
    query = query.order("updated_at", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) return null;

  const clients = (data ?? []) as Client[];

  const planIds = Array.from(
    new Set(
      clients
        .map((c) => c.plan_id)
        .filter((id): id is string => typeof id === "string" && !!id.trim()),
    ),
  );

  if (planIds.length > 0) {
    const supabaseAdmin = createAdminClient();
    const { data: plansRows } = await supabaseAdmin
      .from("plans")
      .select("id, code, name, images_limit")
      .in("id", planIds)
      .is("deleted_at", null);

    const plansById = new Map<string, Plan>();
    for (const p of (plansRows ?? []) as Plan[]) {
      plansById.set(p.id, p);
    }

    for (const c of clients) {
      c.plan = c.plan_id ? (plansById.get(c.plan_id) ?? null) : null;
    }
  } else {
    for (const c of clients) c.plan = null;
  }

  return { clients, total: count ?? 0 };
}

export interface ClientsLogosAndAssetCounts {
  assetCountsByClientId: Record<string, number>;
  logoByClientId: Record<string, string | null | undefined>;
}

/**
 * Fetches primary logos and asset counts for a list of client IDs.
 */
export async function getClientsLogosAndAssetCounts(
  clientIds: string[],
): Promise<ClientsLogosAndAssetCounts> {
  const assetCountsByClientId: Record<string, number> = {};
  const logoByClientId: Record<string, string | null | undefined> = {};

  if (clientIds.length === 0) {
    return { assetCountsByClientId, logoByClientId };
  }

  const supabase = await createClient();
  const [logosRes, assetsRes] = await Promise.all([
    supabase
      .from("client_assets")
      .select("client_id,file_url")
      .eq("asset_type", "logo")
      .eq("is_primary", true)
      .in("client_id", clientIds)
      .is("deleted_at", null),
    supabase
      .from("client_assets")
      .select("client_id,id")
      .in("client_id", clientIds)
      .is("deleted_at", null),
  ]);

  for (const row of (logosRes.data ?? []) as Array<{
    client_id: string;
    file_url: string | null;
  }>) {
    logoByClientId[row.client_id] = row.file_url;
  }

  for (const row of (assetsRes.data ?? []) as Array<{ client_id: string }>) {
    assetCountsByClientId[row.client_id] =
      (assetCountsByClientId[row.client_id] ?? 0) + 1;
  }

  return { assetCountsByClientId, logoByClientId };
}

export interface ClientDetailPageData {
  client: Client | null;
  plan: Plan | null;
  quota: {
    imagesLimit: number;
    imagesUsed: number;
  } | null;
  assets: ClientAsset[];
  frames: ClientAsset[];
  fonts: ClientFont[];
  variants: string[];
  canvasSessions: CanvasSessionSummary[];
  generatedImages: Array<{
    id: string;
    client_id: string;
    cost: number | null;
    prompt: string | null;
    created_at: string;
  }>;
}

/**
 * Fetches all data needed for the client detail page using a single Supabase client.
 * Does NOT call requireAdmin - the page must do that once before calling this.
 */
export async function getClientDetailPageData(
  clientId: string,
): Promise<ClientDetailPageData> {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  const clientRes = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .is("deleted_at", null)
    .single();

  const client =
    clientRes.error || !clientRes.data ? null : (clientRes.data as Client);
  const caUserId = client?.ca_user_id ?? null;
  const planId = client?.plan_id ?? null;

  const [
    assetsRes,
    framesRes,
    fontsRes,
    variantsRes,
    sessionsRes,
    generatedRes,
    planRes,
    usageCountRes,
  ] = await Promise.all([
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
      .order("is_brand", { ascending: false })
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
      .select(
        "id, client_id, ca_user_id, name, thumbnail_url, background_url, created_at, updated_at",
      )
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    caUserId
      ? supabaseAdmin
          .from("generated_images")
          .select("id, client_id, cost, prompt, created_at")
          .eq("client_id", caUserId)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null } as unknown as {
          data: unknown[];
          error: null;
        }),
    planId
      ? supabaseAdmin
          .from("plans")
          .select("id, code, name, images_limit")
          .eq("id", planId)
          .is("deleted_at", null)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as unknown as {
          data: null;
          error: null;
        }),
    caUserId
      ? supabaseAdmin
          .from("generated_images")
          .select("id", { count: "exact", head: true })
          .eq("client_id", caUserId)
      : Promise.resolve({ count: 0 } as unknown as { count: number }),
  ]);

  const variants = Array.from(
    new Set(
      (variantsRes.data ?? [])
        .map((r) => r.variant)
        .filter((v): v is string => v != null),
    ),
  ).sort();

  return {
    client,
    plan: (planRes as any)?.data ? ((planRes as any).data as Plan) : null,
    quota:
      caUserId && (planRes as any)?.data
        ? {
            imagesLimit: ((planRes as any).data as Plan).images_limit,
            imagesUsed: (usageCountRes as any)?.count ?? 0,
          }
        : null,
    assets: (assetsRes.data ?? []) as ClientAsset[],
    frames: (framesRes.data ?? []) as ClientAsset[],
    fonts: (fontsRes.data ?? []) as ClientFont[],
    variants,
    canvasSessions: (sessionsRes.data ?? []) as CanvasSessionSummary[],
    generatedImages: (generatedRes.data ?? []) as Array<{
      id: string;
      client_id: string;
      cost: number | null;
      prompt: string | null;
      created_at: string;
    }>,
  };
}

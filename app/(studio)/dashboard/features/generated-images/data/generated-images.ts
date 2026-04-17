import { createAdminClient, createClient } from "@/lib/supabase/server";
import { createNameMap } from "@/app/(studio)/dashboard/utils/data-utils";

export type GeneratedImageRow = {
  id: string;
  client_id: string;
  cost: number | null;
  prompt: string | null;
  created_at: string;
};

export type GeneratedImageListItem = GeneratedImageRow & {
  image_url: string;
  client_name?: string;
};

export type GeneratedImagesPageData = {
  images: GeneratedImageListItem[];
  clients: Array<{ id: string; name: string; ca_user_id: string }>;
  total: number;
  page: number;
  pageSize: number;
};

function escapeIlikePattern(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "''")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

function buildImageProxyUrl(id: string): string {
  return `/api/images/${id}`;
}

export async function getGeneratedImagesPageData(
  options: {
    page?: number;
    pageSize?: number;
    search?: string;
    clientCaUserId?: string;
  } = {},
): Promise<GeneratedImagesPageData | null> {
  const {
    page: rawPage = 1,
    pageSize: rawPageSize = 48,
    search,
    clientCaUserId,
  } = options;

  const page = Math.max(1, rawPage);
  const pageSize = Math.min(200, Math.max(1, rawPageSize));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Use the user client for reading `clients` (already used elsewhere in dashboard)
  // and service-role client for `generated_images` to avoid empty results under RLS.
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  let query = supabaseAdmin
    .from("generated_images")
    .select("id, client_id, cost, prompt, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (clientCaUserId) {
    query = query.eq("client_id", clientCaUserId);
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    const pattern = `'%${escapeIlikePattern(trimmedSearch)}%'`;
    query = query.or(`prompt.ilike.${pattern},client_id.ilike.${pattern}`);
  }

  query = query.range(from, to);

  const [imagesRes, clientsRes] = await Promise.all([
    query,
    supabase
      .from("clients")
      .select("id, name, ca_user_id")
      .is("deleted_at", null),
  ]);

  if (imagesRes.error) return null;

  const clients = ((clientsRes.data ?? []) as Array<{
    id: string;
    name: string;
    ca_user_id: string;
  }>)
    .filter((c) => Boolean(c.ca_user_id && c.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const clientNamesById = createNameMap(clientsRes.data ?? []);
  const clientNameByCaUserId = new Map<string, string>();
  for (const row of (clientsRes.data ?? []) as Array<{
    id: string;
    name: string;
    ca_user_id: string;
  }>) {
    if (row.ca_user_id) clientNameByCaUserId.set(row.ca_user_id, row.name);
    if (row.id && row.name) clientNameByCaUserId.set(row.id, row.name);
  }

  const images = ((imagesRes.data ?? []) as GeneratedImageRow[]).map((img) => ({
    ...img,
    image_url: buildImageProxyUrl(img.id),
    client_name:
      clientNameByCaUserId.get(img.client_id) ??
      clientNamesById[img.client_id] ??
      undefined,
  }));

  return {
    images,
    clients,
    total: imagesRes.count ?? 0,
    page,
    pageSize,
  };
}

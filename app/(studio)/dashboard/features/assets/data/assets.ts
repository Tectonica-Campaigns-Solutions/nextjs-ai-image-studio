import { createClient } from "@/lib/supabase/server";
import type { ClientAsset } from "@/app/(studio)/dashboard/utils/types";
import { createNameMap } from "@/app/(studio)/dashboard/utils/data-utils";

export interface AssetsPageData {
  assets: ClientAsset[];
  totalAssets: number;
  clientNames: Record<string, string>;
}

export async function getAssetsPageData(
  limit = 500,
): Promise<AssetsPageData | null> {
  const supabase = await createClient();

  const [{ data, count, error }, clientsRes] = await Promise.all([
    supabase
      .from("client_assets")
      .select(
        "id, client_id, name, display_name, file_url, asset_type, mime_type, width, height, created_at, is_primary, variant",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("clients").select("id, name").is("deleted_at", null),
  ]);

  if (error || !data) return null;

  const clientNames = createNameMap(clientsRes.data ?? []);

  return {
    assets: data as ClientAsset[],
    totalAssets: count ?? 0,
    clientNames,
  };
}

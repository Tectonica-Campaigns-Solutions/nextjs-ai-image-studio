import { createClient } from "@/lib/supabase/server";
import type {
  ClientAsset,
  ClientFont,
} from "@/app/(studio)/dashboard/utils/types";
import { createNameMap } from "@/app/(studio)/dashboard/utils/data-utils";

export interface FramesFontsPageData {
  frames: ClientAsset[];
  fonts: ClientFont[];
  clientNames: Record<string, string>;
}

export async function getFramesFontsPageData(
  framesLimit = 500,
  fontsLimit = 500,
): Promise<FramesFontsPageData | null> {
  const supabase = await createClient();

  const [framesRes, fontsRes, clientsRes] = await Promise.all([
    supabase
      .from("client_assets")
      .select(
        "id, client_id, name, display_name, file_url, asset_type, mime_type, width, height, created_at, is_primary, variant",
        { count: "exact" },
      )
      .eq("asset_type", "frame")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(framesLimit),
    supabase
      .from("client_fonts")
      .select(
        "id, client_id, font_source, font_family, font_weights, font_category, file_url, is_primary, is_brand, sort_order, created_at",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("is_brand", { ascending: false })
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(fontsLimit),
    supabase.from("clients").select("id, name").is("deleted_at", null),
  ]);

  if (framesRes.error || !framesRes.data || fontsRes.error) return null;

  return {
    frames: framesRes.data as ClientAsset[],
    fonts: (fontsRes.data ?? []) as ClientFont[],
    clientNames: createNameMap(clientsRes.data ?? []),
  };
}

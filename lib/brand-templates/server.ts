import { createAdminClient } from "@/lib/supabase/server";
import type {
  BrandFormatKey,
  BrandTemplate,
  BrandTemplateFabricJson,
  BrandTemplateFormat,
  BrandTemplateWithFormats,
} from "./types";
import { getBrandFormat } from "./formats";

/**
 * Data access for brand_templates / brand_template_formats. Both tables are
 * service-role only (RLS), so every caller must authorize first: dashboard
 * code via requireAdmin/isAdmin, the Studio via its own client resolution.
 */

const BUCKET = "client-assets";
const STORAGE_PREFIX = "brand-templates";

const TEMPLATE_COLUMNS =
  "id, client_id, name, category, description, thumbnail_url, variants, is_active, sort_order, created_at, updated_at";
const FORMAT_SUMMARY_COLUMNS =
  "id, template_id, format_key, width, height, thumbnail_url, updated_at";
const FORMAT_COLUMNS = `${FORMAT_SUMMARY_COLUMNS}, fabric_json`;

type FormatSummary = Omit<BrandTemplateFormat, "fabric_json">;

export type BrandTemplateListItem = BrandTemplate & { formats: FormatSummary[] };

function normalizeTemplate<T extends { variants?: unknown }>(row: T): T {
  return { ...row, variants: Array.isArray(row.variants) ? row.variants : [] };
}

/** All non-deleted templates with their format summaries (no fabric_json). */
export async function listBrandTemplatesForAdmin(): Promise<BrandTemplateListItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brand_templates")
    .select(`${TEMPLATE_COLUMNS}, formats:brand_template_formats(${FORMAT_SUMMARY_COLUMNS})`)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list brand templates: ${error.message}`);
  return (data ?? []).map((row) => normalizeTemplate(row as unknown as BrandTemplateListItem));
}

export async function getBrandTemplateWithFormats(
  templateId: string,
): Promise<BrandTemplateWithFormats | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brand_templates")
    .select(`${TEMPLATE_COLUMNS}, formats:brand_template_formats(${FORMAT_COLUMNS})`)
    .eq("id", templateId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(`Failed to load brand template: ${error.message}`);
  return data ? normalizeTemplate(data as unknown as BrandTemplateWithFormats) : null;
}

export async function upsertBrandTemplateFormat(params: {
  templateId: string;
  formatKey: BrandFormatKey;
  fabricJson: BrandTemplateFabricJson;
  thumbnailUrl: string | null;
  userId: string;
}): Promise<BrandTemplateFormat> {
  const { width, height } = getBrandFormat(params.formatKey);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("brand_template_formats")
    .upsert(
      {
        template_id: params.templateId,
        format_key: params.formatKey,
        width,
        height,
        fabric_json: params.fabricJson,
        ...(params.thumbnailUrl ? { thumbnail_url: params.thumbnailUrl } : {}),
        created_by: params.userId,
        updated_by: params.userId,
      },
      { onConflict: "template_id,format_key" },
    )
    .select(FORMAT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Failed to save template format: ${error?.message ?? "no row"}`);
  }
  return data as unknown as BrandTemplateFormat;
}

export async function deleteBrandTemplateFormat(
  templateId: string,
  formatKey: BrandFormatKey,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("brand_template_formats")
    .delete()
    .eq("template_id", templateId)
    .eq("format_key", formatKey);
  if (error) throw new Error(`Failed to delete template format: ${error.message}`);
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const BRAND_TEMPLATE_IMAGE_TYPES = Object.keys(EXT_BY_TYPE);

/** Uploads a template image (variant background or thumbnail) and returns its public URL. */
export async function uploadBrandTemplateImage(params: {
  data: ArrayBuffer | Buffer;
  contentType: string;
  /** Folder under brand-templates/, e.g. the template id. */
  folder: string;
  name: string;
}): Promise<string> {
  const ext = EXT_BY_TYPE[params.contentType];
  if (!ext) throw new Error("Unsupported image type");

  const safeFolder = params.folder.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeName = params.name.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "image";
  const path = `${STORAGE_PREFIX}/${safeFolder}/${safeName}-${Date.now()}.${ext}`;

  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, params.data, {
    contentType: params.contentType,
    upsert: false,
  });
  if (error) throw new Error(`Failed to upload template image: ${error.message}`);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Decodes a `data:image/png;base64,...` URL produced by canvas.toDataURL. */
export function decodeImageDataUrl(
  dataUrl: string,
): { buffer: Buffer; contentType: string } | null {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
}

/**
 * Active templates a Studio user can use: global ones plus the ones assigned
 * to their client (resolved from the `client_id` query param = clients.ca_user_id).
 * Includes layouts; only formats with at least one saved layout are returned.
 */
export async function listActiveBrandTemplatesForClient(
  caUserId: string | undefined,
): Promise<BrandTemplateWithFormats[]> {
  const supabase = createAdminClient();

  let clientRowId: string | null = null;
  const trimmed = caUserId?.trim();
  if (trimmed) {
    const { data } = await supabase
      .from("clients")
      .select("id")
      .eq("ca_user_id", trimmed)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();
    clientRowId = data?.id ?? null;
  }

  let query = supabase
    .from("brand_templates")
    .select(`${TEMPLATE_COLUMNS}, formats:brand_template_formats(${FORMAT_COLUMNS})`)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  query = clientRowId
    ? query.or(`client_id.is.null,client_id.eq.${clientRowId}`)
    : query.is("client_id", null);

  const { data, error } = await query;
  if (error) {
    console.error("[brand-templates] failed to list for client:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => normalizeTemplate(row as unknown as BrandTemplateWithFormats))
    .map((t) => ({ ...t, formats: t.formats.filter((f) => f.fabric_json?.objects?.length > 0) }))
    .filter((t) => t.formats.length > 0);
}

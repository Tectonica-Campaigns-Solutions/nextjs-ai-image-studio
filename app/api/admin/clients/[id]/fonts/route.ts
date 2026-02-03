import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/admin/utils/admin-utils";
import { uploadFontFile } from "@/app/(studio)/admin/utils/font-utils";
import {
  errorResponse,
  validateIdParam,
} from "@/app/api/admin/_lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_FONTS } from "@/app/(studio)/standalone/studio/utils/studio-utils";

async function getParams(
  params: Promise<{ id: string }>
): Promise<{ id: string; error: null } | { id: null; error: NextResponse }> {
  const { id } = await params;
  const invalid = validateIdParam(id);
  if (invalid) return { id: null, error: invalid };
  return { id, error: null };
}

const VALID_WEIGHTS = [
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
];

/**
 * GET /api/admin/clients/[id]/fonts
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const paramsResult = await getParams(context.params);
  if (paramsResult.error) return paramsResult.error;
  const { id } = paramsResult;

  try {
    const supabase = await createClient();
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (clientError || !client) return errorResponse("Client not found", 404);

    const { data: fonts, error } = await supabase
      .from("client_fonts")
      .select("*")
      .eq("client_id", id)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return errorResponse("Failed to fetch fonts", 500);
    return NextResponse.json({ fonts: fonts || [] });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/admin/clients/[id]/fonts
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const paramsResult = await getParams(context.params);
  if (paramsResult.error) return paramsResult.error;
  const { id } = paramsResult;

  try {
    const supabase = await createClient();
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (clientError || !client) return errorResponse("Client not found", 404);

    const formData = await request.formData();
    const fontSource = formData.get("font_source") as string;
    const fontFamily = formData.get("font_family") as string;
    const fontWeightsStr = formData.get("font_weights") as string;
    const fontCategory = formData.get("font_category") as string | null;
    const isPrimary = formData.get("is_primary") === "true";

    if (!fontSource || !["google", "custom"].includes(fontSource)) {
      return errorResponse("font_source must be 'google' or 'custom'", 400);
    }
    if (
      !fontFamily ||
      typeof fontFamily !== "string" ||
      fontFamily.trim() === ""
    ) {
      return errorResponse(
        "font_family is required and must be a non-empty string",
        400
      );
    }

    let fontWeights: string[] = ["400"];
    if (fontWeightsStr) {
      try {
        fontWeights = JSON.parse(fontWeightsStr);
        if (!Array.isArray(fontWeights)) throw new Error("array");
        if (!fontWeights.every((w) => VALID_WEIGHTS.includes(String(w)))) {
          return errorResponse(
            `font_weights must be one of: ${VALID_WEIGHTS.join(", ")}`,
            400
          );
        }
      } catch {
        return errorResponse("font_weights must be a valid JSON array", 400);
      }
    }

    let fileUrl: string | null = null;
    let storagePath: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;

    if (fontSource === "google") {
      const isValidGoogleFont = GOOGLE_FONTS.some(
        (f) => f.family === fontFamily
      );
      if (!isValidGoogleFont) {
        return errorResponse(
          `Font family '${fontFamily}' is not a valid Google Font`,
          400
        );
      }
    } else if (fontSource === "custom") {
      const file = formData.get("file") as File;
      if (!file) return errorResponse("File is required for custom fonts", 400);
      const uploadResult = await uploadFontFile(file, id, fontFamily.trim());
      if (!uploadResult.success || !uploadResult.url || !uploadResult.path) {
        return errorResponse(
          uploadResult.error || "Failed to upload font file",
          500
        );
      }
      fileUrl = uploadResult.url;
      storagePath = uploadResult.path;
      fileSize = file.size;
      mimeType = file.type;
    }

    if (isPrimary) {
      await supabase
        .from("client_fonts")
        .update({ is_primary: false })
        .eq("client_id", id)
        .is("deleted_at", null);
    }

    const { data: lastFont } = await supabase
      .from("client_fonts")
      .select("sort_order")
      .eq("client_id", id)
      .is("deleted_at", null)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = lastFont ? (lastFont.sort_order || 0) + 1 : 0;

    const insertData: Record<string, unknown> = {
      client_id: id,
      font_source: fontSource,
      font_family: fontFamily.trim(),
      font_weights: fontWeights,
      font_category: fontCategory?.trim() || null,
      is_primary: isPrimary,
      sort_order: nextSortOrder,
      created_by: adminCheck.user.id,
      updated_by: adminCheck.user.id,
    };
    if (fontSource === "custom") {
      insertData.file_url = fileUrl;
      insertData.storage_path = storagePath;
      insertData.file_size = fileSize;
      insertData.mime_type = mimeType;
    }

    const { data: font, error: insertError } = await supabase
      .from("client_fonts")
      .insert(insertData)
      .select()
      .single();

    if (insertError) return errorResponse("Failed to save font metadata", 500);
    return NextResponse.json({ font }, { status: 201 });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

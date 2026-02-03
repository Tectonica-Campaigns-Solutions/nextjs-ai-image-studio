import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import {
  errorResponse,
  validateIdParam,
} from "@/app/api/dashboard/_lib/api-response";
import { NextRequest, NextResponse } from "next/server";

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

async function getParams(
  params: Promise<{ id: string; fontId: string }>
): Promise<
  | { id: string; fontId: string; error: null }
  | { id: null; fontId: null; error: NextResponse }
> {
  const { id, fontId } = await params;
  const invalidId = validateIdParam(id);
  if (invalidId) return { id: null, fontId: null, error: invalidId };
  const invalidFontId = validateIdParam(fontId, "fontId");
  if (invalidFontId) return { id: null, fontId: null, error: invalidFontId };
  return { id, fontId, error: null };
}

/**
 * GET /api/dashboard/clients/[id]/fonts/[fontId]
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; fontId: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const paramsResult = await getParams(context.params);
  if (paramsResult.error) return paramsResult.error;
  const { id, fontId } = paramsResult;

  try {
    const supabase = await createClient();
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (clientError || !client) return errorResponse("Client not found", 404);

    const { data: font, error } = await supabase
      .from("client_fonts")
      .select("*")
      .eq("id", fontId)
      .eq("client_id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116")
        return errorResponse("Font not found", 404);
      return errorResponse("Failed to fetch font", 500);
    }
    return NextResponse.json({ font });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/dashboard/clients/[id]/fonts/[fontId]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; fontId: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const paramsResult = await getParams(context.params);
  if (paramsResult.error) return paramsResult.error;
  const { id, fontId } = paramsResult;

  try {
    const supabase = await createClient();
    const body = await request.json();
    const { font_family, font_weights, font_category, is_primary, sort_order } =
      body;

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (clientError || !client) return errorResponse("Client not found", 404);

    const { data: existingFont, error: fontError } = await supabase
      .from("client_fonts")
      .select("id, is_primary")
      .eq("id", fontId)
      .eq("client_id", id)
      .is("deleted_at", null)
      .single();

    if (fontError || !existingFont) return errorResponse("Font not found", 404);

    const updateData: Record<string, unknown> = {
      updated_by: adminCheck.user.id,
    };
    if (font_family !== undefined) {
      if (typeof font_family !== "string" || font_family.trim() === "") {
        return errorResponse("font_family must be a non-empty string", 400);
      }
      updateData.font_family = font_family.trim();
    }
    if (font_weights !== undefined) {
      if (!Array.isArray(font_weights)) {
        return errorResponse("font_weights must be an array", 400);
      }
      if (!font_weights.every((w) => VALID_WEIGHTS.includes(String(w)))) {
        return errorResponse(
          `font_weights must be one of: ${VALID_WEIGHTS.join(", ")}`,
          400
        );
      }
      updateData.font_weights = font_weights;
    }
    if (font_category !== undefined) {
      updateData.font_category = font_category?.trim() || null;
    }
    if (sort_order !== undefined) {
      if (typeof sort_order !== "number" || sort_order < 0) {
        return errorResponse("sort_order must be a non-negative number", 400);
      }
      updateData.sort_order = sort_order;
    }
    if (is_primary !== undefined) {
      const newIsPrimary = Boolean(is_primary);
      if (newIsPrimary && !existingFont.is_primary) {
        await supabase
          .from("client_fonts")
          .update({ is_primary: false })
          .eq("client_id", id)
          .neq("id", fontId)
          .is("deleted_at", null);
      }
      updateData.is_primary = newIsPrimary;
    }

    const { data: font, error } = await supabase
      .from("client_fonts")
      .update(updateData)
      .eq("id", fontId)
      .select()
      .single();

    if (error) return errorResponse("Failed to update font", 500);
    return NextResponse.json({ font });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * DELETE /api/dashboard/clients/[id]/fonts/[fontId]
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; fontId: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const paramsResult = await getParams(context.params);
  if (paramsResult.error) return paramsResult.error;
  const { id, fontId } = paramsResult;

  try {
    const supabase = await createClient();
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (clientError || !client) return errorResponse("Client not found", 404);

    const { data: font, error: fontError } = await supabase
      .from("client_fonts")
      .select("id, font_source, storage_path")
      .eq("id", fontId)
      .eq("client_id", id)
      .is("deleted_at", null)
      .single();

    if (fontError || !font) return errorResponse("Font not found", 404);

    const { error: deleteError } = await supabase
      .from("client_fonts")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: adminCheck.user.id,
      })
      .eq("id", fontId);

    if (deleteError) return errorResponse("Failed to delete font", 500);
    return NextResponse.json({ success: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

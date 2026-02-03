import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/admin/utils/admin-utils";
import {
  errorResponse,
  validateIdParam,
} from "@/app/api/admin/_lib/api-response";
import { NextRequest, NextResponse } from "next/server";

async function getParams(
  params: Promise<{ id: string; assetId: string }>
): Promise<
  | { id: string; assetId: string; error: null }
  | { id: null; assetId: null; error: NextResponse }
> {
  const { id, assetId } = await params;
  const invalidId = validateIdParam(id);
  if (invalidId) return { id: null, assetId: null, error: invalidId };
  const invalidAssetId = validateIdParam(assetId, "assetId");
  if (invalidAssetId) return { id: null, assetId: null, error: invalidAssetId };
  return { id, assetId, error: null };
}

/**
 * GET /api/admin/clients/[id]/assets/[assetId]
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; assetId: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const { id, assetId, error: paramError } = await getParams(context.params);
  if (paramError) return paramError;

  try {
    const supabase = await createClient();
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (clientError || !client) {
      return errorResponse("Client not found", 404);
    }

    const { data: asset, error } = await supabase
      .from("client_assets")
      .select("*")
      .eq("id", assetId)
      .eq("client_id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116")
        return errorResponse("Asset not found", 404);
      return errorResponse("Failed to fetch asset", 500);
    }
    return NextResponse.json({ asset });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/admin/clients/[id]/assets/[assetId]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; assetId: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const paramsResult = await getParams(context.params);
  if (paramsResult.error) return paramsResult.error;
  const { id, assetId } = paramsResult;

  try {
    const supabase = await createClient();
    const body = await request.json();
    const { name, display_name, is_primary, sort_order } = body;

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (clientError || !client) return errorResponse("Client not found", 404);

    const { data: existingAsset, error: assetError } = await supabase
      .from("client_assets")
      .select("id, asset_type, is_primary")
      .eq("id", assetId)
      .eq("client_id", id)
      .is("deleted_at", null)
      .single();

    if (assetError || !existingAsset)
      return errorResponse("Asset not found", 404);

    const updateData: Record<string, unknown> = {
      updated_by: adminCheck.user.id,
    };
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return errorResponse("name must be a non-empty string", 400);
      }
      updateData.name = name.trim();
    }
    if (display_name !== undefined) {
      updateData.display_name = display_name?.trim() || null;
    }
    if (sort_order !== undefined) {
      if (typeof sort_order !== "number" || sort_order < 0) {
        return errorResponse("sort_order must be a non-negative number", 400);
      }
      updateData.sort_order = sort_order;
    }
    if (is_primary !== undefined) {
      const newIsPrimary = Boolean(is_primary);
      if (newIsPrimary && !existingAsset.is_primary) {
        await supabase
          .from("client_assets")
          .update({ is_primary: false })
          .eq("client_id", id)
          .eq("asset_type", existingAsset.asset_type)
          .neq("id", assetId)
          .is("deleted_at", null);
      }
      updateData.is_primary = newIsPrimary;
    }

    const { data: asset, error } = await supabase
      .from("client_assets")
      .update(updateData)
      .eq("id", assetId)
      .select()
      .single();

    if (error) return errorResponse("Failed to update asset", 500);
    return NextResponse.json({ asset });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * DELETE /api/admin/clients/[id]/assets/[assetId]
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; assetId: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const paramsResult = await getParams(context.params);
  if (paramsResult.error) return paramsResult.error;
  const { id, assetId } = paramsResult;

  try {
    const supabase = await createClient();
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (clientError || !client) return errorResponse("Client not found", 404);

    const { data: asset, error: assetError } = await supabase
      .from("client_assets")
      .select("id, storage_path")
      .eq("id", assetId)
      .eq("client_id", id)
      .is("deleted_at", null)
      .single();

    if (assetError || !asset) return errorResponse("Asset not found", 404);

    const { error: deleteError } = await supabase
      .from("client_assets")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: adminCheck.user.id,
      })
      .eq("id", assetId);

    if (deleteError) return errorResponse("Failed to delete asset", 500);
    return NextResponse.json({ success: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

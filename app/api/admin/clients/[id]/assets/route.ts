import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/admin/utils/admin-utils";
import { uploadAsset } from "@/app/(studio)/admin/utils/storage-utils";
import {
  errorResponse,
  validateIdParam,
} from "@/app/api/admin/_lib/api-response";
import { NextRequest, NextResponse } from "next/server";

async function getParams(
  params: Promise<{ id: string }>
): Promise<{ id: string; error: null } | { id: null; error: NextResponse }> {
  const { id } = await params;
  const invalid = validateIdParam(id);
  if (invalid) return { id: null, error: invalid };
  return { id, error: null };
}

/**
 * GET /api/admin/clients/[id]/assets
 */
export async function GET(
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
    const searchParams = request.nextUrl.searchParams;
    const assetType = searchParams.get("asset_type");
    const variant = searchParams.get("variant");

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (clientError || !client) {
      return errorResponse("Client not found", 404);
    }

    let query = supabase
      .from("client_assets")
      .select("*")
      .eq("client_id", id)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (assetType) query = query.eq("asset_type", assetType);
    if (variant) query = query.eq("variant", variant);

    const { data: assets, error } = await query;

    if (error) return errorResponse("Failed to fetch assets", 500);
    return NextResponse.json({ assets: assets || [] });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/admin/clients/[id]/assets
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

    if (clientError || !client) {
      return errorResponse("Client not found", 404);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const displayName = formData.get("display_name") as string | null;
    const assetType = (formData.get("asset_type") as string) || "logo";
    const isPrimary = formData.get("is_primary") === "true";
    const variant = formData.get("variant") as string | null;

    if (!file) return errorResponse("File is required", 400);
    if (!name || typeof name !== "string" || name.trim() === "") {
      return errorResponse(
        "name is required and must be a non-empty string",
        400
      );
    }
    if (!["logo", "image", "document"].includes(assetType)) {
      return errorResponse(
        "asset_type must be one of: logo, image, document",
        400
      );
    }

    let variantValue: string | null = null;
    if (variant && typeof variant === "string" && variant.trim() !== "") {
      const trimmed = variant.trim();
      if (trimmed.length > 50)
        return errorResponse("variant must be 50 characters or less", 400);
      variantValue = trimmed;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return errorResponse(
        "Tipo de archivo no permitido. Solo se permiten imágenes.",
        400
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      return errorResponse(
        "Archivo demasiado grande. Tamaño máximo: 10MB",
        400
      );
    }

    const uploadResult = await uploadAsset(file, id, assetType);
    if (!uploadResult.success || !uploadResult.url || !uploadResult.path) {
      return errorResponse(uploadResult.error || "Failed to upload file", 500);
    }

    let width: number | null = null;
    let height: number | null = null;
    if (file.type.startsWith("image/")) {
      try {
        const sharp = await import("sharp").catch(() => null);
        if (sharp) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const metadata = await sharp.default(buffer).metadata();
          width = metadata.width || null;
          height = metadata.height || null;
        }
      } catch {
        // ignore
      }
    }

    if (isPrimary) {
      await supabase
        .from("client_assets")
        .update({ is_primary: false })
        .eq("client_id", id)
        .eq("asset_type", assetType)
        .is("deleted_at", null);
    }

    const { data: lastAsset } = await supabase
      .from("client_assets")
      .select("sort_order")
      .eq("client_id", id)
      .eq("asset_type", assetType)
      .is("deleted_at", null)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = lastAsset ? (lastAsset.sort_order || 0) + 1 : 0;

    const { data: asset, error: insertError } = await supabase
      .from("client_assets")
      .insert({
        client_id: id,
        asset_type: assetType,
        name: name.trim(),
        display_name: displayName?.trim() || null,
        file_url: uploadResult.url,
        storage_path: uploadResult.path,
        file_size: file.size,
        mime_type: file.type,
        width,
        height,
        is_primary: isPrimary,
        sort_order: nextSortOrder,
        variant: variantValue,
        created_by: adminCheck.user.id,
        updated_by: adminCheck.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return errorResponse("Failed to save asset metadata", 500);
    }

    return NextResponse.json({ asset }, { status: 201 });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

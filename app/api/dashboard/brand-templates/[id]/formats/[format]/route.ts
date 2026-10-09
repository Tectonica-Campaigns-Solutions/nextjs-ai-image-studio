import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { errorResponse, validateIdParam } from "@/app/api/dashboard/_lib/api-response";
import { isBrandFormatKey } from "@/lib/brand-templates/formats";
import { brandTemplateFabricJsonSchema } from "@/lib/brand-templates/schemas";
import {
  decodeImageDataUrl,
  deleteBrandTemplateFormat,
  getBrandTemplateWithFormats,
  uploadBrandTemplateImage,
  upsertBrandTemplateFormat,
} from "@/lib/brand-templates/server";
import { createAdminClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string; format: string }> };

const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

async function resolveParams(context: RouteContext) {
  const { id, format } = await context.params;
  const invalid = validateIdParam(id);
  if (invalid) return { response: invalid } as const;
  if (!isBrandFormatKey(format)) return { response: errorResponse("Invalid format", 400) } as const;
  return { id, format } as const;
}

/**
 * PUT /api/dashboard/brand-templates/:id/formats/:format
 * Body: { fabric_json, thumbnail_data_url? }. Saves the layout authored in the
 * Studio (template-author mode) and its preview thumbnail.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const resolved = await resolveParams(context);
  if ("response" in resolved) return resolved.response;
  const { id, format } = resolved;

  try {
    const body = await request.json().catch(() => null);
    const parsed = brandTemplateFabricJsonSchema.safeParse(body?.fabric_json);
    if (!parsed.success) return errorResponse("Invalid layout", 400);

    const slotIds = parsed.data.objects.map((o) => o.slotId).filter(Boolean);
    if (new Set(slotIds).size !== slotIds.length) {
      return errorResponse("Slot names must be unique within a format", 400);
    }

    const template = await getBrandTemplateWithFormats(id);
    if (!template) return errorResponse("Template not found", 404);

    let thumbnailUrl: string | null = null;
    if (typeof body?.thumbnail_data_url === "string") {
      const decoded = decodeImageDataUrl(body.thumbnail_data_url);
      if (!decoded || decoded.buffer.byteLength > MAX_THUMBNAIL_BYTES) {
        return errorResponse("Invalid thumbnail", 400);
      }
      thumbnailUrl = await uploadBrandTemplateImage({
        data: decoded.buffer,
        contentType: decoded.contentType,
        folder: id,
        name: format,
      });
    }

    const saved = await upsertBrandTemplateFormat({
      templateId: id,
      formatKey: format,
      fabricJson: parsed.data as never,
      thumbnailUrl,
      userId: adminCheck.user.id,
    });

    // The template card shows the square layout, or the first one saved until
    // a square exists.
    if (thumbnailUrl && (format === "square" || !template.thumbnail_url)) {
      await createAdminClient()
        .from("brand_templates")
        .update({ thumbnail_url: thumbnailUrl, updated_by: adminCheck.user.id })
        .eq("id", id);
    }

    return NextResponse.json({ format: saved });
  } catch (error) {
    console.error("[brand-templates format PUT] failed:", error);
    return errorResponse("Failed to save layout", 500);
  }
}

/** DELETE /api/dashboard/brand-templates/:id/formats/:format */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const resolved = await resolveParams(context);
  if ("response" in resolved) return resolved.response;

  try {
    await deleteBrandTemplateFormat(resolved.id, resolved.format);

    // A template without layouts can't be used in the Studio.
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("brand_template_formats")
      .select("id", { count: "exact", head: true })
      .eq("template_id", resolved.id);
    if (!count) {
      await supabase
        .from("brand_templates")
        .update({ is_active: false, updated_by: adminCheck.user.id })
        .eq("id", resolved.id);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[brand-templates format DELETE] failed:", error);
    return errorResponse("Failed to delete layout", 500);
  }
}

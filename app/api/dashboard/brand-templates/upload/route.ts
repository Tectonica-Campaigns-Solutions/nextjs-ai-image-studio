import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { errorResponse } from "@/app/api/dashboard/_lib/api-response";
import {
  BRAND_TEMPLATE_IMAGE_TYPES,
  uploadBrandTemplateImage,
} from "@/lib/brand-templates/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * POST /api/dashboard/brand-templates/upload
 * Uploads a background-variant image for a template. Returns { url }.
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return errorResponse("No file provided", 400);
    if (!BRAND_TEMPLATE_IMAGE_TYPES.includes(file.type)) {
      return errorResponse("Only PNG, JPEG or WebP images are allowed", 400);
    }
    if (file.size > MAX_FILE_SIZE) return errorResponse("File too large. Maximum size: 10MB", 400);

    const url = await uploadBrandTemplateImage({
      data: await file.arrayBuffer(),
      contentType: file.type,
      folder: "variants",
      name: file.name.replace(/\.[^/.]+$/, ""),
    });
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error("[brand-templates upload] failed:", error);
    return errorResponse("Failed to upload image", 500);
  }
}

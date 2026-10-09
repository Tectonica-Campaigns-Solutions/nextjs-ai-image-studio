import { NextRequest, NextResponse } from "next/server";
import { uploadTemplatePhotoToStorage } from "../canvas-sessions/_lib/canvas-session-service";

export const runtime = "nodejs";

/**
 * POST /api/studio/template-photos
 * Body: { image_base64: data URL, ca_user_id }. Stores an image used in a
 * template design (see saveTemplateDesign) and returns its public URL.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const image = body?.image_base64;
  const caUserId = body?.ca_user_id;
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "image_base64 must be an image data URL" }, { status: 400 });
  }
  if (typeof caUserId !== "string" || !caUserId.trim()) {
    return NextResponse.json({ error: "ca_user_id is required" }, { status: 400 });
  }

  const result = await uploadTemplatePhotoToStorage(image, caUserId.trim());
  if (typeof result !== "string") {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ url: result });
}

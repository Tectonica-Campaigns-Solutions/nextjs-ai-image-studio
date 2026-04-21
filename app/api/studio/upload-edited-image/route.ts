import { NextRequest, NextResponse } from "next/server";
import { storeOutputImage } from "@/lib/bfl-client";

export const runtime = "nodejs";

function parseBase64Image(base64: string): {
  buffer: Buffer;
  format: "jpeg" | "png";
} {
  let mimeType = "image/png";
  let base64Data = base64;

  if (base64.startsWith("data:")) {
    const match = base64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }
  }

  const buffer = Buffer.from(base64Data, "base64");
  const format: "jpeg" | "png" =
    mimeType === "image/jpeg" || mimeType === "image/jpg" ? "jpeg" : "png";

  return { buffer, format };
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { image_base64, ca_user_id } = body as Record<string, unknown>;

  if (!image_base64 || typeof image_base64 !== "string") {
    return NextResponse.json(
      { error: "image_base64 is required" },
      { status: 400 },
    );
  }

  if (!ca_user_id || typeof ca_user_id !== "string" || !ca_user_id.trim()) {
    return NextResponse.json(
      { error: "ca_user_id is required" },
      { status: 400 },
    );
  }

  try {
    const { buffer, format } = parseBase64Image(image_base64);
    const { proxyUrl } = await storeOutputImage(
      buffer,
      ca_user_id.trim(),
      format,
    );
    return NextResponse.json({ image_url: proxyUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[upload-edited-image] failed:", message);
    return NextResponse.json(
      { error: "Failed to upload image", detail: message },
      { status: 500 },
    );
  }
}

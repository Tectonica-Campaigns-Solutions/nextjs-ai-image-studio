import { NextRequest, NextResponse } from "next/server";
import { uploadConversationImageToStorage } from "../canvas-sessions/_lib/canvas-session-service";

export const runtime = "nodejs";

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

  const imageUrl = await uploadConversationImageToStorage(
    image_base64,
    ca_user_id.trim(),
  );

  if (!imageUrl) {
    return NextResponse.json(
      { error: "Failed to upload image to storage" },
      { status: 500 },
    );
  }

  return NextResponse.json({ image_url: imageUrl });
}

import { NextRequest, NextResponse } from "next/server";
import {
  sessionBelongsToUser,
  uploadThumbnailToStorage,
  updateSessionThumbnail,
} from "../_lib/canvas-session-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { session_id, ca_user_id, image_base64 } = body as Record<string, unknown>;

  if (!session_id || typeof session_id !== "string") {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }
  if (!ca_user_id || typeof ca_user_id !== "string") {
    return NextResponse.json({ error: "ca_user_id is required" }, { status: 400 });
  }
  if (!image_base64 || typeof image_base64 !== "string") {
    return NextResponse.json({ error: "image_base64 is required" }, { status: 400 });
  }

  const sessionId = session_id.trim();
  const caUserId = ca_user_id.trim();

  // Sessions of other users answer 404, same as a missing one.
  if (!(await sessionBelongsToUser(sessionId, caUserId))) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const thumbnailUrl = await uploadThumbnailToStorage(image_base64, caUserId, sessionId);
  if (!thumbnailUrl) {
    return NextResponse.json({ error: "Failed to upload thumbnail" }, { status: 500 });
  }

  await updateSessionThumbnail(sessionId, caUserId, thumbnailUrl);

  return NextResponse.json({ thumbnail_url: thumbnailUrl });
}

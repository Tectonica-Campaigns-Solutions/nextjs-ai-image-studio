import { NextRequest, NextResponse } from "next/server";
import { getSessionById } from "../_lib/canvas-session-service";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id?.trim()) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
  }

  const result = await getSessionById(id.trim());
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    id: result.id,
    name: result.name,
    background_url: result.background_url,
    overlay_json: result.overlay_json,
    metadata: result.metadata,
    thumbnail_url: result.thumbnail_url,
    created_at: result.created_at,
    updated_at: result.updated_at,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionById } from "../_lib/canvas-session-service";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const caUserId = request.nextUrl.searchParams.get("ca_user_id");

  if (!id?.trim()) {
    return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
  }
  if (!caUserId?.trim()) {
    return NextResponse.json(
      { error: "ca_user_id query parameter is required" },
      { status: 400 }
    );
  }

  // Sessions of other users answer 404, same as a missing one.
  const result = await getSessionById(id.trim(), caUserId.trim());
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    id: result.id,
    name: result.name,
    background_url: result.background_url,
    kind: result.kind ?? "image",
    template_id: result.template_id ?? null,
    template_state: result.template_state ?? null,
    overlay_json: result.overlay_json,
    metadata: result.metadata,
    thumbnail_url: result.thumbnail_url,
    created_at: result.created_at,
    updated_at: result.updated_at,
  });
}

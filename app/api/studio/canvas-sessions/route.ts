import { NextRequest, NextResponse } from "next/server";
import { saveSession, listSessions } from "./_lib/canvas-session-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const caUserId = searchParams.get("ca_user_id");

  if (!caUserId?.trim()) {
    return NextResponse.json(
      { error: "ca_user_id query parameter is required" },
      { status: 400 }
    );
  }

  const result = await listSessions(caUserId.trim());
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const summaries = result.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail_url: s.thumbnail_url,
    background_url: s.background_url,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }));

  return NextResponse.json({ sessions: summaries });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { ca_user_id, session_id, name, background_url, overlay_json, metadata } = body as Record<string, unknown>;

  if (!ca_user_id || typeof ca_user_id !== "string" || !ca_user_id.trim()) {
    return NextResponse.json({ error: "ca_user_id is required" }, { status: 400 });
  }
  if (!background_url || typeof background_url !== "string") {
    return NextResponse.json({ error: "background_url is required" }, { status: 400 });
  }
  if (!overlay_json || typeof overlay_json !== "object") {
    return NextResponse.json({ error: "overlay_json is required and must be an object" }, { status: 400 });
  }

  const result = await saveSession({
    ca_user_id: ca_user_id.trim(),
    session_id: typeof session_id === "string" ? session_id : undefined,
    name: typeof name === "string" ? name : undefined,
    background_url,
    overlay_json: overlay_json as Record<string, unknown>,
    metadata: (metadata && typeof metadata === "object" ? metadata : {}) as Record<string, unknown>,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ id: result.id });
}

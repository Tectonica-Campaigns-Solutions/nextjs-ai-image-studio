import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface SaveSessionPayload {
  ca_user_id: string;
  session_id?: string;
  name?: string;
  background_url: string;
  overlay_json: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface SessionRow {
  id: string;
  client_id: string | null;
  ca_user_id: string;
  name: string | null;
  background_url: string;
  overlay_json: Record<string, unknown>;
  metadata: Record<string, unknown>;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

async function resolveClientId(
  supabase: ReturnType<typeof createServiceClient>,
  caUserId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("ca_user_id", caUserId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .single();
  return data?.id ?? null;
}

const BUCKET_NAME = "client-assets";

export async function uploadThumbnailToStorage(
  base64: string,
  caUserId: string,
  sessionId: string
): Promise<string | null> {
  try {
    const supabase = createServiceClient();

    const clientId = await resolveClientId(supabase, caUserId);
    if (!clientId) {
      console.error("[canvas-session-service] client not found for ca_user_id:", caUserId);
      return null;
    }

    let mimeType = "image/jpeg";
    let base64Data = base64;
    if (base64.startsWith("data:")) {
      const match = base64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const buffer = Buffer.from(base64Data, "base64");
    // Fixed path per session — upsert overwrites the same file on every save
    const filePath = `clients/${clientId}/thumbnails/${sessionId}.jpg`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, { contentType: "image/jpeg", upsert: true });

    if (error) {
      console.error("[canvas-session-service] thumbnail storage upload failed:", error);
      return null;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
  } catch (err) {
    console.error("[canvas-session-service] thumbnail upload error:", err);
    return null;
  }
}

export async function updateSessionThumbnail(
  sessionId: string,
  thumbnailUrl: string
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase
      .from("client_canvas_sessions")
      .update({ thumbnail_url: thumbnailUrl, updated_at: new Date().toISOString() })
      .eq("id", sessionId);
  } catch (err) {
    console.error("[canvas-session-service] updateSessionThumbnail error:", err);
  }
}

export async function saveSession(
  payload: SaveSessionPayload
): Promise<{ id: string } | { error: string }> {
  const supabase = createServiceClient();
  const clientId = await resolveClientId(supabase, payload.ca_user_id);

  if (payload.session_id) {
    const { data: existing } = await supabase
      .from("client_canvas_sessions")
      .select("id")
      .eq("id", payload.session_id)
      .eq("ca_user_id", payload.ca_user_id)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return { error: "Session not found or access denied" };
    }

    const updateData: Record<string, unknown> = {
      background_url: payload.background_url,
      overlay_json: payload.overlay_json,
      metadata: payload.metadata,
      updated_at: new Date().toISOString(),
    };
    if (payload.name !== undefined) updateData.name = payload.name;

    const { error } = await supabase
      .from("client_canvas_sessions")
      .update(updateData)
      .eq("id", payload.session_id);

    if (error) return { error: "Failed to update session" };
    return { id: payload.session_id };
  }

  const insertData: Record<string, unknown> = {
    ca_user_id: payload.ca_user_id,
    client_id: clientId,
    background_url: payload.background_url,
    overlay_json: payload.overlay_json,
    metadata: payload.metadata,
    name: payload.name ?? null,
  };

  const { data, error } = await supabase
    .from("client_canvas_sessions")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !data) return { error: "Failed to create session" };
  return { id: data.id };
}

export async function listSessions(
  caUserId: string
): Promise<SessionRow[] | { error: string }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("client_canvas_sessions")
    .select(
      "id, client_id, ca_user_id, name, thumbnail_url, background_url, overlay_json, metadata, created_at, updated_at"
    )
    .eq("ca_user_id", caUserId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) return { error: "Failed to fetch sessions" };
  return (data ?? []) as SessionRow[];
}

export async function getSessionById(
  sessionId: string
): Promise<SessionRow | { error: string }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("client_canvas_sessions")
    .select(
      "id, client_id, ca_user_id, name, thumbnail_url, background_url, overlay_json, metadata, created_at, updated_at"
    )
    .eq("id", sessionId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return { error: "Session not found" };
  return data as SessionRow;
}

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
  /** Lineage key: the image URL Studio was first opened with. Set on insert only. */
  root_image_url?: string;
  chat_id?: string;
  overlay_json: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface SessionRow {
  id: string;
  client_id: string | null;
  ca_user_id: string;
  name: string | null;
  background_url: string;
  root_image_url: string | null;
  chat_id: string | null;
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

/**
 * Storage folder for a user's Studio files: their client's folder, or — for
 * users without a clients row (most users coming from the Tectonica iframe) —
 * a per-user folder, so their uploads don't fail.
 */
async function resolveStorageFolder(
  supabase: ReturnType<typeof createServiceClient>,
  caUserId: string
): Promise<string> {
  const clientId = await resolveClientId(supabase, caUserId);
  if (clientId) return `clients/${clientId}`;
  return `users/${caUserId.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

export async function uploadThumbnailToStorage(
  base64: string,
  caUserId: string,
  sessionId: string
): Promise<string | null> {
  try {
    const supabase = createServiceClient();

    const folder = await resolveStorageFolder(supabase, caUserId);

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
    const filePath = `${folder}/thumbnails/${sessionId}.jpg`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, { contentType: "image/jpeg", upsert: true });

    if (error) {
      console.error("[canvas-session-service] thumbnail storage upload failed:", error);
      return null;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // The path is fixed per session, so bust browser/CDN caches on every upload;
    // otherwise Saved versions keeps showing the previous thumbnail.
    return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}?v=${Date.now()}`;
  } catch (err) {
    console.error("[canvas-session-service] thumbnail upload error:", err);
    return null;
  }
}

export async function uploadConversationImageToStorage(
  base64: string,
  caUserId: string
): Promise<string | null> {
  try {
    const supabase = createServiceClient();

    const folder = await resolveStorageFolder(supabase, caUserId);

    let mimeType = "image/png";
    let base64Data = base64;
    if (base64.startsWith("data:")) {
      const match = base64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const extension =
      mimeType === "image/jpeg" || mimeType === "image/jpg"
        ? "jpg"
        : mimeType === "image/webp"
        ? "webp"
        : "png";

    const buffer = Buffer.from(base64Data, "base64");

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${extension}`;
    const filePath = `${folder}/conversation-outputs/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error(
        "[canvas-session-service] conversation image storage upload failed:",
        error
      );
      return null;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
  } catch (err) {
    console.error("[canvas-session-service] conversation image upload error:", err);
    return null;
  }
}

export async function sessionBelongsToUser(
  sessionId: string,
  caUserId: string
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("client_canvas_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("ca_user_id", caUserId)
    .is("deleted_at", null)
    .maybeSingle();
  return !!data;
}

export async function updateSessionThumbnail(
  sessionId: string,
  caUserId: string,
  thumbnailUrl: string
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase
      .from("client_canvas_sessions")
      .update({ thumbnail_url: thumbnailUrl, updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("ca_user_id", caUserId);
  } catch (err) {
    console.error("[canvas-session-service] updateSessionThumbnail error:", err);
  }
}

function countOverlays(overlayJson: Record<string, unknown>): number {
  return Array.isArray(overlayJson.objects) ? overlayJson.objects.length : 0;
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
    console.log("[canvas-session-service] session updated", {
      id: payload.session_id,
      ca_user_id: payload.ca_user_id,
      background_url: payload.background_url,
      overlays: countOverlays(payload.overlay_json),
    });
    return { id: payload.session_id };
  }

  const insertData: Record<string, unknown> = {
    ca_user_id: payload.ca_user_id,
    client_id: clientId,
    background_url: payload.background_url,
    root_image_url: payload.root_image_url ?? null,
    chat_id: payload.chat_id ?? null,
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
  console.log("[canvas-session-service] session created", {
    id: data.id,
    ca_user_id: payload.ca_user_id,
    name: payload.name ?? null,
    background_url: payload.background_url,
    overlays: countOverlays(payload.overlay_json),
  });
  return { id: data.id };
}

const SESSION_COLUMNS =
  "id, client_id, ca_user_id, name, thumbnail_url, background_url, root_image_url, chat_id, overlay_json, metadata, created_at, updated_at";

/**
 * Saved versions of one image lineage for a user. Rows saved before lineages
 * existed (root_image_url NULL) are matched by their background_url instead.
 */
export async function listSessions(
  caUserId: string,
  rootImageUrl: string
): Promise<SessionRow[] | { error: string }> {
  const supabase = createServiceClient();
  const baseQuery = () =>
    supabase
      .from("client_canvas_sessions")
      .select(SESSION_COLUMNS)
      .eq("ca_user_id", caUserId)
      .is("deleted_at", null);

  const [lineage, legacy] = await Promise.all([
    baseQuery().eq("root_image_url", rootImageUrl),
    baseQuery().is("root_image_url", null).eq("background_url", rootImageUrl),
  ]);

  if (lineage.error || legacy.error) return { error: "Failed to fetch sessions" };
  return [...(lineage.data ?? []), ...(legacy.data ?? [])].sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at)
  ) as SessionRow[];
}

export async function getSessionById(
  sessionId: string,
  caUserId: string
): Promise<SessionRow | { error: string }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("client_canvas_sessions")
    .select(
      "id, client_id, ca_user_id, name, thumbnail_url, background_url, overlay_json, metadata, created_at, updated_at"
    )
    .eq("id", sessionId)
    .eq("ca_user_id", caUserId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return { error: "Session not found" };
  console.log("[canvas-session-service] session loaded", {
    id: data.id,
    ca_user_id: data.ca_user_id,
    background_url: data.background_url,
    overlays: countOverlays((data.overlay_json ?? {}) as Record<string, unknown>),
  });
  return data as SessionRow;
}

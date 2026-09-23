import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { CanvasSessionData, ObjectMetadata } from "../types/image-editor-types";

export async function getCanvasSession(
  sessionId: string
): Promise<CanvasSessionData | null> {
  if (!sessionId?.trim()) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("client_canvas_sessions")
      .select("id, name, background_url, overlay_json, metadata")
      .eq("id", sessionId.trim())
      .is("deleted_at", null)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name ?? null,
      background_url: data.background_url,
      overlay_json: data.overlay_json as Record<string, unknown>,
      metadata: (data.metadata ?? {}) as Record<number, ObjectMetadata>,
    };
  } catch (err) {
    console.error("[getCanvasSession] error:", err);
    return null;
  }
}

// Proxy URLs returned by storeOutputImage: `${APP_URL}/api/images/{uuid}`.
const GENERATED_IMAGE_PATH_REGEX = /^\/api\/images\/([0-9a-f-]{36})\/?$/i;

/**
 * Resolves the editable canvas session behind an image that Studio sent to the
 * chat (flattened image + linked layers snapshot). Returns null when the URL is
 * not a Studio proxy URL, has no linked session, or the session belongs to
 * another user — the editor then just opens the flat image.
 */
export async function getCanvasSessionForImageUrl(
  imageUrl: string | undefined,
  caUserId: string | undefined
): Promise<CanvasSessionData | null> {
  if (!imageUrl?.trim() || !caUserId?.trim()) return null;

  let generatedImageId: string | undefined;
  try {
    generatedImageId = new URL(imageUrl.trim()).pathname.match(GENERATED_IMAGE_PATH_REGEX)?.[1];
  } catch {
    return null;
  }
  if (!generatedImageId) return null;

  try {
    const supabase = createAdminClient();
    const { data: image } = await supabase
      .from("generated_images")
      .select("canvas_session_id")
      .eq("id", generatedImageId)
      .maybeSingle();
    const sessionId = image?.canvas_session_id as string | null | undefined;
    if (!sessionId) return null;

    const { data, error } = await supabase
      .from("client_canvas_sessions")
      .select("id, name, background_url, overlay_json, metadata")
      .eq("id", sessionId)
      .eq("ca_user_id", caUserId.trim())
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name ?? null,
      background_url: data.background_url,
      overlay_json: data.overlay_json as Record<string, unknown>,
      metadata: (data.metadata ?? {}) as Record<number, ObjectMetadata>,
    };
  } catch (err) {
    console.error("[getCanvasSessionForImageUrl] error:", err);
    return null;
  }
}

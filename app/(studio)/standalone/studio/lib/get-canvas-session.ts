import { createAdminClient } from "@/lib/supabase/server";
import type {
  CanvasSessionData,
  ObjectMetadata,
  TemplateSessionState,
} from "../types/image-editor-types";

/**
 * Loads a saved version for `?session_id=` (reload / resume). Uses the admin
 * client — RLS hides these rows from the anon client — so it only returns
 * sessions owned by the requesting user.
 */
export async function getCanvasSession(
  sessionId: string,
  caUserId: string | undefined
): Promise<CanvasSessionData | null> {
  if (!sessionId?.trim() || !caUserId?.trim()) return null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("client_canvas_sessions")
      .select("id, name, background_url, root_image_url, overlay_json, metadata, kind, template_id, template_state")
      .eq("id", sessionId.trim())
      .eq("ca_user_id", caUserId.trim())
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name ?? null,
      background_url: data.background_url,
      root_image_url: data.root_image_url ?? null,
      overlay_json: data.overlay_json as Record<string, unknown>,
      metadata: (data.metadata ?? {}) as Record<number, ObjectMetadata>,
      kind: data.kind === "template" ? "template" : "image",
      template_id: data.template_id ?? null,
      template_state: (data.template_state ?? null) as TemplateSessionState | null,
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
      .select("id, name, background_url, root_image_url, overlay_json, metadata, kind, template_id, template_state")
      .eq("id", sessionId)
      .eq("ca_user_id", caUserId.trim())
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name ?? null,
      background_url: data.background_url,
      root_image_url: data.root_image_url ?? null,
      overlay_json: data.overlay_json as Record<string, unknown>,
      metadata: (data.metadata ?? {}) as Record<number, ObjectMetadata>,
      kind: data.kind === "template" ? "template" : "image",
      template_id: data.template_id ?? null,
      template_state: (data.template_state ?? null) as TemplateSessionState | null,
    };
  } catch (err) {
    console.error("[getCanvasSessionForImageUrl] error:", err);
    return null;
  }
}

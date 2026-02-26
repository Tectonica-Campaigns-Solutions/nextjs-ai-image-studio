import { createClient } from "@/lib/supabase/server";
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

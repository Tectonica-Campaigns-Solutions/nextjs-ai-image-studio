import type { Canvas } from "fabric";
import type { BrandTemplateFabricJson } from "@/lib/brand-templates/types";
import type { TemplateSessionState } from "../types/image-editor-types";
import { getTemplateLayoutFromCanvas } from "./template-layout";

/**
 * Saved versions of template designs (client_canvas_sessions, kind=template).
 * Objects are stored like template layouts: in the format's native pixels, so
 * a version reopens identically at any screen size.
 */

/**
 * Uploads in-browser images (user photos, custom logos: data: URLs) and points
 * the layout at the stored copies. `cache` maps data URL → stored URL so the
 * same photo is uploaded once per editor session.
 */
export async function persistLayoutImages(
  layout: BrandTemplateFabricJson,
  caUserId: string,
  cache: Map<string, string>,
): Promise<BrandTemplateFabricJson> {
  const objects = await Promise.all(
    layout.objects.map(async (obj) => {
      const src = typeof obj.src === "string" ? obj.src : null;
      if (!src?.startsWith("data:")) return obj;
      let stored = cache.get(src);
      if (!stored) {
        const res = await fetch("/api/studio/template-photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: src, ca_user_id: caUserId }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.url) throw new Error("Could not store an image of the design");
        stored = String(json.url);
        cache.set(src, stored);
      }
      return { ...obj, src: stored };
    }),
  );
  return { ...layout, objects };
}

export async function saveTemplateDesign(params: {
  canvas: Canvas;
  nativeWidth: number;
  caUserId: string;
  chatId?: string;
  name?: string;
  templateId: string;
  state: TemplateSessionState;
  imageCache: Map<string, string>;
}): Promise<string> {
  const layout = await persistLayoutImages(
    getTemplateLayoutFromCanvas(params.canvas, params.nativeWidth),
    params.caUserId,
    params.imageCache,
  );
  const res = await fetch("/api/studio/canvas-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ca_user_id: params.caUserId,
      kind: "template",
      template_id: params.templateId,
      template_state: params.state,
      name: params.name?.trim() || undefined,
      chat_id: params.chatId,
      overlay_json: layout,
      metadata: {},
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.id) throw new Error(data?.error ?? "Could not save the design");
  return String(data.id);
}

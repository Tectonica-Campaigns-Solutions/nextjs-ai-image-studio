import type { Canvas, FabricObject } from "fabric";
import type { BrandFormatPreset } from "@/lib/brand-templates/formats";
import type {
  BrandSlotCrop,
  BrandSlotProps,
  BrandTemplateFabricJson,
} from "@/lib/brand-templates/types";
import { serializeCanvas } from "../utils/image-editor-utils";
import { layoutToDisplayOverlayJSON, remapLayoutToFormat } from "./template-layout";

/**
 * What the user made of a template, independent of the format: slot contents
 * (by slotId) and the elements they added themselves. Captured before a format
 * switch and re-applied on the new format's layout.
 */
export interface TemplateContent {
  texts: Record<string, { text: string; style: Record<string, unknown> }>;
  photos: Record<string, { src: string; crop: BrandSlotCrop | null }>;
  /** User-added objects, in the source format's native pixels. */
  extras: BrandTemplateFabricJson;
}

type SlotObject = FabricObject & BrandSlotProps & { text?: string; getSrc?: () => string };

/** Text styling a user may change and that should follow the text to other formats. */
const CARRIED_TEXT_STYLE = [
  "fill",
  "fontFamily",
  "fontWeight",
  "fontStyle",
  "underline",
  "linethrough",
  "textAlign",
  "textBackgroundColor",
  "charSpacing",
] as const;

export function captureTemplateContent(canvas: Canvas, nativeWidth: number): TemplateContent {
  const content: TemplateContent = { texts: {}, photos: {}, extras: { objects: [] } };
  const objects = canvas.getObjects().slice(1) as SlotObject[];
  const json = serializeCanvas(canvas);
  const descriptors = (json.objects ?? []).slice(1);
  const factor = nativeWidth / (canvas.width || nativeWidth);

  objects.forEach((obj, index) => {
    if (obj.slotId && obj.slotType === "text" && typeof obj.text === "string") {
      const style: Record<string, unknown> = {};
      for (const key of CARRIED_TEXT_STYLE) style[key] = (obj as never)[key];
      content.texts[obj.slotId] = { text: obj.text, style };
      return;
    }
    if (obj.slotId && obj.slotType === "image" && obj.type === "image" && obj.slotShape) {
      // Only photos the user placed (placeholders have no slotShape).
      content.photos[obj.slotId] = { src: obj.getSrc?.() ?? "", crop: obj.slotCrop ?? null };
      return;
    }
    if (!obj.templateLayer) {
      const d = descriptors[index];
      if (d) {
        content.extras.objects.push({
          ...d,
          left: (d.left ?? 0) * factor,
          top: (d.top ?? 0) * factor,
          scaleX: (d.scaleX ?? 1) * factor,
          scaleY: (d.scaleY ?? 1) * factor,
        });
      }
    }
  });
  content.extras.version = json.version;
  return content;
}

/**
 * Applies captured content to a freshly loaded layout: texts by slotId now,
 * extras remapped to the new format. Returns how many extras were moved.
 * Photos are applied by the caller (they load asynchronously).
 */
export async function applyTemplateTexts(canvas: Canvas, content: TemplateContent): Promise<void> {
  for (const obj of canvas.getObjects().slice(1) as SlotObject[]) {
    const saved = obj.slotId ? content.texts[obj.slotId] : undefined;
    if (!saved || obj.slotType !== "text") continue;
    obj.set({ ...saved.style, text: saved.text } as never);
    (obj as { initDimensions?: () => void }).initDimensions?.();
    obj.setCoords();
  }
}

export function extrasToDisplayOverlayJSON(
  content: TemplateContent,
  from: BrandFormatPreset,
  to: BrandFormatPreset,
  canvas: Canvas,
): string | null {
  if (content.extras.objects.length === 0) return null;
  const remapped = remapLayoutToFormat(content.extras, from, to);
  return layoutToDisplayOverlayJSON(remapped, canvas, to.width);
}

/** Marks every object of a layout as coming from the template. */
export function markAsTemplateLayer(layout: BrandTemplateFabricJson): BrandTemplateFabricJson {
  return { ...layout, objects: layout.objects.map((o) => ({ ...o, templateLayer: true })) };
}

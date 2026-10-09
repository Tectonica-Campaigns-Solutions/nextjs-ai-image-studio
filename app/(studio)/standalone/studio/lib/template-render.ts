import { StaticCanvas, util, type Canvas, type FabricObject } from "fabric";
import { getBrandFormat, type BrandFormatPreset } from "@/lib/brand-templates/formats";
import type {
  BrandFormatKey,
  BrandTemplateVariant,
  BrandTemplateWithFormats,
} from "@/lib/brand-templates/types";
import { createBackgroundObject, fitBackgroundToCanvas } from "./canvas-background";
import { applyTemplateTexts, type TemplateContent } from "./template-content";
import { remapLayoutToFormat } from "./template-layout";
import { fillPhotoSlot, type SlotObject } from "./photo-slots";
import { blankSourceFor } from "../hooks/use-template-mode";

export type RenderedImageType = "png" | "jpeg";

async function addObjects(canvas: StaticCanvas, objects: Record<string, unknown>[]): Promise<void> {
  if (objects.length === 0) return;
  const enlivened = (await util.enlivenObjects(objects)) as FabricObject[];
  enlivened.forEach((o) => canvas.add(o));
}

/**
 * Renders a template format at its native size with the user's content
 * (texts, photos, own elements) applied, without touching the editor canvas.
 * Used to export or save the formats other than the one being edited.
 */
export async function renderTemplateFormat(params: {
  template: BrandTemplateWithFormats;
  formatKey: BrandFormatKey;
  variant: BrandTemplateVariant | null;
  content: TemplateContent;
  /** Format the content was captured from (for remapping the user's own elements). */
  sourceFormat: BrandFormatPreset;
  type?: RenderedImageType;
}): Promise<string> {
  const format = getBrandFormat(params.formatKey);
  const layout = params.template.formats.find((f) => f.format_key === params.formatKey)?.fabric_json;
  if (!layout) throw new Error(`Template has no ${format.label} layout`);

  const el = document.createElement("canvas");
  const canvas = new StaticCanvas(el, { width: format.width, height: format.height });
  try {
    const source = blankSourceFor(params.template, format, params.variant);
    canvas.backgroundColor = source.backgroundColor;
    const { object: background } = await createBackgroundObject(source);
    fitBackgroundToCanvas(background, format.width, format.height);
    canvas.add(background);

    // Native-size canvas: layout and content need no display scaling.
    await addObjects(canvas, layout.objects);
    const asEditor = canvas as unknown as Canvas;
    await applyTemplateTexts(asEditor, params.content);
    for (const slot of canvas.getObjects().slice(1) as SlotObject[]) {
      const photo = slot.slotId ? params.content.photos[slot.slotId] : undefined;
      if (!photo?.src || slot.slotType !== "image") continue;
      await fillPhotoSlot(asEditor, slot, photo.src, photo.crop ?? undefined);
    }
    if (params.content.extras.objects.length > 0) {
      const remapped = remapLayoutToFormat(params.content.extras, params.sourceFormat, format);
      await addObjects(canvas, remapped.objects);
    }

    if (typeof document !== "undefined" && document.fonts?.ready) await document.fonts.ready;
    canvas.renderAll();
    const type = params.type ?? "png";
    return canvas.toDataURL({ format: type, quality: type === "jpeg" ? 0.95 : 1, multiplier: 1 });
  } finally {
    canvas.dispose();
  }
}

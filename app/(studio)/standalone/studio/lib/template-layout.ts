import type { Canvas } from "fabric";
import type { BrandTemplateFabricJson } from "@/lib/brand-templates/types";
import { serializeCanvas } from "../utils/image-editor-utils";

/**
 * Template layouts are stored in the format's native pixels (e.g. 1080×1350);
 * the editor shows a scaled-down canvas. These helpers convert overlay object
 * descriptors between the two by scaling geometry.
 */

type Descriptor = Record<string, any>;

function scaleDescriptor(obj: Descriptor, factor: number): Descriptor {
  return {
    ...obj,
    left: (obj.left ?? 0) * factor,
    top: (obj.top ?? 0) * factor,
    scaleX: (obj.scaleX ?? 1) * factor,
    scaleY: (obj.scaleY ?? 1) * factor,
  };
}

/** Overlay objects of the canvas (no background), in native format pixels. */
export function getTemplateLayoutFromCanvas(
  canvas: Canvas,
  nativeWidth: number,
): BrandTemplateFabricJson {
  const json = serializeCanvas(canvas);
  const displayWidth = canvas.width || nativeWidth;
  const factor = nativeWidth / displayWidth;
  return {
    version: json.version,
    objects: (json.objects ?? []).slice(1).map((o) => scaleDescriptor(o, factor)),
  };
}

/** Overlay JSON (display pixels) ready for history.loadOverlaysFromJSON. */
export function layoutToDisplayOverlayJSON(
  layout: BrandTemplateFabricJson,
  canvas: Canvas,
  nativeWidth: number,
): string {
  const factor = (canvas.width || nativeWidth) / nativeWidth;
  return JSON.stringify({
    version: layout.version ?? "6.4.3",
    objects: layout.objects.map((o) => scaleDescriptor(o, factor)),
  });
}

/**
 * Re-fits a layout designed for one format into another: object centers keep
 * their relative position and objects scale uniformly by the smaller ratio,
 * so nothing is stretched. A starting point for the author, not a final layout.
 */
export function remapLayoutToFormat(
  layout: BrandTemplateFabricJson,
  from: { width: number; height: number },
  to: { width: number; height: number },
): BrandTemplateFabricJson {
  const rx = to.width / from.width;
  const ry = to.height / from.height;
  const uniform = Math.min(rx, ry);

  return {
    version: layout.version,
    objects: layout.objects.map((obj: Descriptor) => {
      const scaleX = obj.scaleX ?? 1;
      const scaleY = obj.scaleY ?? 1;
      const w = (obj.width ?? 0) * scaleX;
      const h = (obj.height ?? 0) * scaleY;
      // Fabric v6 defaults to a top-left origin; layouts are saved that way.
      const cx = (obj.left ?? 0) + w / 2;
      const cy = (obj.top ?? 0) + h / 2;
      const newScaleX = scaleX * uniform;
      const newScaleY = scaleY * uniform;
      return {
        ...obj,
        scaleX: newScaleX,
        scaleY: newScaleY,
        left: cx * rx - ((obj.width ?? 0) * newScaleX) / 2,
        top: cy * ry - ((obj.height ?? 0) * newScaleY) / 2,
      };
    }),
  };
}

/** Small preview for the dashboard card / gallery. */
export function getTemplateThumbnailDataUrl(canvas: Canvas, maxWidth = 480): string {
  const multiplier = maxWidth / (canvas.width || maxWidth);
  canvas.discardActiveObject();
  canvas.renderAll();
  return canvas.toDataURL({ format: "jpeg", quality: 0.85, multiplier });
}

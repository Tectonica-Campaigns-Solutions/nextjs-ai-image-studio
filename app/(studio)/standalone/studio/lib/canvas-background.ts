import { Rect, type FabricObject } from "fabric";
import { loadImageWithCORS } from "../utils/image-editor-utils";

/**
 * What the canvas is built from. Object 0 is always the background
 * (`isBackground`), so the rest of the editor (history, snapshots, layers)
 * keeps working the same way for both kinds.
 */
export type CanvasSource =
  | { kind: "image"; imageUrl: string }
  /**
   * Fixed-size canvas (e.g. a Branding template format) with a solid color or an
   * image that covers it (centered crop). The color shows if the image fails.
   */
  | {
      kind: "blank";
      width: number;
      height: number;
      backgroundColor: string;
      backgroundImageUrl?: string | null;
      /** Bump to force a rebuild with identical settings (e.g. reopening a saved design). */
      revision?: number;
    };

export type BlankCanvasSource = Extract<CanvasSource, { kind: "blank" }>;

/** Canvas color behind image backgrounds (shows through transparent pixels). */
export const CANVAS_BASE_COLOR = "#f8f9fa";

/** Color the canvas itself should have for a source. */
export function getCanvasBaseColor(source: CanvasSource): string {
  return source.kind === "blank" ? source.backgroundColor : CANVAS_BASE_COLOR;
}

/** Stable identity for effects: changes only when the canvas must be rebuilt. */
export function getCanvasSourceKey(source: CanvasSource | null): string | null {
  if (!source) return null;
  return source.kind === "image"
    ? `image:${source.imageUrl}`
    : `blank:${source.width}x${source.height}:${source.backgroundColor}:${source.backgroundImageUrl ?? ""}:${source.revision ?? 0}`;
}

/** Background objects are not selectable, movable or exported as overlays. */
export function lockAsBackground(obj: FabricObject): void {
  obj.set({
    left: 0,
    top: 0,
    selectable: false,
    evented: false,
    lockMovementX: true,
    lockMovementY: true,
    lockRotation: true,
    lockScalingX: true,
    lockScalingY: true,
    hasControls: false,
    hasBorders: false,
  });
  (obj as any).isBackground = true;
  (obj as any).isEditable = false;
}

/**
 * Scales a background object so it spans exactly `width`×`height` canvas pixels.
 * Works for any background (image, cropped image, rect) because it uses the
 * object's own unscaled size.
 */
export function fitBackgroundToCanvas(obj: FabricObject, width: number, height: number): void {
  obj.set({
    left: 0,
    top: 0,
    scaleX: width / (obj.width || width),
    scaleY: height / (obj.height || height),
  });
  obj.setCoords();
}

/**
 * Builds the unscaled background object for a source. `width`/`height` are the
 * natural (export) dimensions; callers scale the object to the display size
 * with fitBackgroundToCanvas.
 */
export async function createBackgroundObject(
  source: CanvasSource,
): Promise<{ object: FabricObject; width: number; height: number }> {
  if (source.kind === "image") {
    const img = await loadImageWithCORS(source.imageUrl);
    lockAsBackground(img);
    return { object: img, width: img.width, height: img.height };
  }

  if (source.backgroundImageUrl) {
    try {
      const img = await loadImageWithCORS(source.backgroundImageUrl);
      // Cover: crop the image (in source pixels) to the canvas aspect ratio, centered.
      const iw = img.width;
      const ih = img.height;
      const scale = Math.max(source.width / iw, source.height / ih);
      const cropW = source.width / scale;
      const cropH = source.height / scale;
      img.set({ cropX: (iw - cropW) / 2, cropY: (ih - cropH) / 2, width: cropW, height: cropH });
      lockAsBackground(img);
      return { object: img, width: source.width, height: source.height };
    } catch (err) {
      console.warn("[canvas-background] image background failed, using color:", err);
    }
  }

  const rect = new Rect({
    width: source.width,
    height: source.height,
    fill: source.backgroundColor,
    strokeWidth: 0,
    objectCaching: false,
  });
  lockAsBackground(rect);
  return { object: rect, width: source.width, height: source.height };
}

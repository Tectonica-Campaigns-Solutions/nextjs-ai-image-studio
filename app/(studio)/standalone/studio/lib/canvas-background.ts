import { Rect, type FabricObject } from "fabric";
import { loadImageWithCORS } from "../utils/image-editor-utils";

/**
 * What the canvas is built from. Object 0 is always the background
 * (`isBackground`), so the rest of the editor (history, snapshots, layers)
 * keeps working the same way for both kinds.
 */
export type CanvasSource =
  | { kind: "image"; imageUrl: string }
  /** Fixed-size canvas with a solid background (e.g. a Branding template format). */
  | { kind: "blank"; width: number; height: number; backgroundColor: string };

export type BlankCanvasSource = Extract<CanvasSource, { kind: "blank" }>;

/** Stable identity for effects: changes only when the canvas must be rebuilt. */
export function getCanvasSourceKey(source: CanvasSource | null): string | null {
  if (!source) return null;
  return source.kind === "image"
    ? `image:${source.imageUrl}`
    : `blank:${source.width}x${source.height}:${source.backgroundColor}`;
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
 * Builds the unscaled background object for a source. `width`/`height` are the
 * natural (export) dimensions; callers scale the object to the display size.
 */
export async function createBackgroundObject(
  source: CanvasSource,
): Promise<{ object: FabricObject; width: number; height: number }> {
  if (source.kind === "image") {
    const img = await loadImageWithCORS(source.imageUrl);
    lockAsBackground(img);
    return { object: img, width: img.width, height: img.height };
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

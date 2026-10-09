import { Ellipse, FabricImage, Point, type Canvas, type FabricObject } from "fabric";
import type { BrandSlotCrop, BrandSlotProps } from "@/lib/brand-templates/types";
import { loadImageWithCORS } from "../utils/image-editor-utils";

/**
 * Photo slots: the template marks a shape (or image) as an "image" slot; the
 * user's photo replaces it, cropped to cover the slot's frame (rect or
 * ellipse). The crop is stored as zoom + focal point so it survives resizing
 * the frame and moving to another format.
 */

export type SlotObject = FabricObject & BrandSlotProps & { getSrc?: () => string };

export const DEFAULT_SLOT_CROP: BrandSlotCrop = { zoom: 1, fx: 0.5, fy: 0.5 };
const MAX_PHOTO_SIDE = 2160;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function isPhotoSlot(obj: SlotObject): boolean {
  return obj.slotType === "image" && !!obj.slotId;
}

/** A photo slot that already holds the user's photo (vs. the template placeholder). */
export function isFilledPhotoSlot(obj: SlotObject): boolean {
  return isPhotoSlot(obj) && obj.type === "image" && !!obj.slotShape;
}

function frameShapeOf(obj: SlotObject): "rect" | "ellipse" {
  if (obj.slotShape) return obj.slotShape;
  return obj.type === "circle" || obj.type === "ellipse" ? "ellipse" : "rect";
}

/**
 * Sets the image's crop (source pixels) so it covers a frame of `frameW`×`frameH`
 * canvas pixels with the given zoom/focal point, keeping the frame size.
 */
export function applySlotCrop(
  img: FabricImage,
  frameW: number,
  frameH: number,
  crop: BrandSlotCrop,
  shape: "rect" | "ellipse",
): void {
  const el = img.getElement() as HTMLImageElement;
  const natW = el.naturalWidth || img.width;
  const natH = el.naturalHeight || img.height;
  const frameRatio = frameW / frameH;

  // Largest area of the frame's aspect ratio inside the photo, then zoom in.
  let baseW = natW;
  let baseH = natW / frameRatio;
  if (baseH > natH) {
    baseH = natH;
    baseW = natH * frameRatio;
  }
  const zoom = clamp(crop.zoom, 1, 4);
  const cropW = baseW / zoom;
  const cropH = baseH / zoom;
  const cropX = clamp(crop.fx * natW - cropW / 2, 0, natW - cropW);
  const cropY = clamp(crop.fy * natH - cropH / 2, 0, natH - cropH);

  const center = img.getCenterPoint();
  img.set({
    cropX,
    cropY,
    width: cropW,
    height: cropH,
    scaleX: frameW / cropW,
    scaleY: frameH / cropH,
    clipPath:
      shape === "ellipse"
        ? new Ellipse({ rx: cropW / 2, ry: cropH / 2, originX: "center", originY: "center" })
        : undefined,
  });
  (img as SlotObject).slotCrop = { zoom, fx: crop.fx, fy: crop.fy };
  img.setPositionByOrigin(center, "center", "center");
  img.setCoords();
}

/** Replaces a photo slot (placeholder or previous photo) with `src`, at the same frame and layer. */
export async function fillPhotoSlot(
  canvas: Canvas,
  slot: SlotObject,
  src: string,
  crop: BrandSlotCrop = DEFAULT_SLOT_CROP,
): Promise<FabricImage> {
  const img = await loadImageWithCORS(src);
  const shape = frameShapeOf(slot);
  const frameW = slot.getScaledWidth();
  const frameH = slot.getScaledHeight();
  const center = slot.getCenterPoint();

  img.set({ angle: slot.angle ?? 0, opacity: slot.opacity ?? 1 });
  Object.assign(img, {
    slotId: slot.slotId,
    slotType: slot.slotType,
    slotLabel: slot.slotLabel,
    templateLayer: slot.templateLayer,
    slotShape: shape,
  } satisfies BrandSlotProps);
  img.setPositionByOrigin(new Point(center.x, center.y), "center", "center");
  applySlotCrop(img, frameW, frameH, crop, shape);

  const index = canvas.getObjects().indexOf(slot);
  canvas.remove(slot);
  canvas.insertAt(index < 0 ? canvas.getObjects().length : index, img);
  canvas.setActiveObject(img);
  canvas.requestRenderAll();
  return img;
}

export function updatePhotoCrop(canvas: Canvas, img: SlotObject, crop: BrandSlotCrop): void {
  const shape = img.slotShape;
  if (!(img instanceof FabricImage) || !shape) return;
  applySlotCrop(img, img.getScaledWidth(), img.getScaledHeight(), crop, shape);
  canvas.requestRenderAll();
}

/** Swaps a logo slot's image keeping it inside the same box (contain), centered. */
export async function replaceLogoSlot(
  canvas: Canvas,
  slot: SlotObject,
  url: string,
): Promise<FabricImage> {
  const img = await loadImageWithCORS(url);
  const boxW = slot.getScaledWidth();
  const boxH = slot.getScaledHeight();
  const scale = Math.min(boxW / img.width, boxH / img.height);
  const center = slot.getCenterPoint();
  img.set({ scaleX: scale, scaleY: scale, angle: slot.angle ?? 0, opacity: slot.opacity ?? 1 });
  Object.assign(img, {
    slotId: slot.slotId,
    slotType: slot.slotType,
    slotLabel: slot.slotLabel,
    templateLayer: slot.templateLayer,
  } satisfies BrandSlotProps);
  (img as unknown as { isLogo: boolean }).isLogo = true;
  img.setPositionByOrigin(center, "center", "center");
  img.setCoords();

  const index = canvas.getObjects().indexOf(slot);
  canvas.remove(slot);
  canvas.insertAt(index < 0 ? canvas.getObjects().length : index, img);
  canvas.requestRenderAll();
  return img;
}

/** Reads a photo file, downscaling large ones so canvas history stays light. */
export async function readPhotoFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.9);
}

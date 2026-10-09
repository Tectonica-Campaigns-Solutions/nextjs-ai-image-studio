import type { Canvas } from "fabric";

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CropAspect {
  key: string;
  label: string;
  /** width / height; null = free, "original" handled by the caller. */
  ratio: number | null;
}

export const CROP_ASPECTS: CropAspect[] = [
  { key: "free", label: "Free", ratio: null },
  { key: "original", label: "Original", ratio: null },
  { key: "1:1", label: "1:1", ratio: 1 },
  { key: "4:5", label: "4:5", ratio: 4 / 5 },
  { key: "9:16", label: "9:16", ratio: 9 / 16 },
  { key: "16:9", label: "16:9", ratio: 16 / 9 },
];

export const MIN_CROP_SIZE = 24;

/** Largest box with `ratio` centered in a `width`×`height` area (whole area when free). */
export function centeredCropBox(width: number, height: number, ratio: number | null): CropBox {
  if (!ratio) return { x: 0, y: 0, w: width, h: height };
  let w = width;
  let h = width / ratio;
  if (h > height) {
    h = height;
    w = height * ratio;
  }
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

/**
 * Crops the canvas background image (object 0) to `box` (display px) at the
 * image's native resolution. Returns a data URL, or null when the image can't
 * be read (cross-origin without CORS).
 */
export function cropBackgroundToDataUrl(canvas: Canvas, box: CropBox): string | null {
  const bg = canvas.getObjects()[0] as unknown as {
    type?: string;
    getElement?: () => HTMLImageElement;
  };
  if (!bg || bg.type !== "image" || !bg.getElement) return null;
  const el = bg.getElement();
  const natW = el.naturalWidth;
  const natH = el.naturalHeight;
  if (!natW || !natH || !canvas.width || !canvas.height) return null;

  const fx = natW / canvas.width;
  const fy = natH / canvas.height;
  const sx = Math.max(0, Math.round(box.x * fx));
  const sy = Math.max(0, Math.round(box.y * fy));
  const sw = Math.min(natW - sx, Math.round(box.w * fx));
  const sh = Math.min(natH - sy, Math.round(box.h * fy));
  if (sw < 2 || sh < 2) return null;

  try {
    const out = document.createElement("canvas");
    out.width = sw;
    out.height = sh;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(el, sx, sy, sw, sh, 0, 0, sw, sh);
    return out.toDataURL("image/png");
  } catch {
    return null;
  }
}

import { FabricImage } from "fabric";

export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await fileToBase64(blob);
  } catch (error) {
    console.error("Error converting URL to base64:", error);
    throw error;
  }
}

export async function loadImageWithCORS(url: string): Promise<FabricImage> {
  try {
    return await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
  } catch (error) {
    console.warn(
      "Failed to load image with CORS, trying without crossOrigin:",
      error,
    );
    try {
      return await FabricImage.fromURL(url);
    } catch (fallbackError) {
      console.error("Failed to load image completely:", fallbackError);
      throw fallbackError;
    }
  }
}

export function rgbaToString(color: {
  r: number;
  g: number;
  b: number;
  a: number;
}): string {
  return `rgba(${color.r},${color.g},${color.b},${color.a})`;
}

export interface GetCurrentBackgroundPayload {
  imageUrls?: string[];
  base64Images?: string[];
}

/**
 * Get the current canvas background image for sending to the edit API.
 * Returns either imageUrls (if the background is an HTTP URL) or base64Images
 * (if it's a data URL or we need to export it).
 */
export function getCurrentBackgroundImageForEdit(canvas: {
  getObjects(): Array<{ type?: string; getElement?: () => HTMLImageElement; _element?: HTMLImageElement }>;
}): GetCurrentBackgroundPayload | null {
  const objects = canvas.getObjects();
  const bg = objects[0];
  if (!bg || bg.type !== "image") return null;

  const bgAny = bg as { getElement?: () => HTMLImageElement; _element?: HTMLImageElement };
  const el = bgAny.getElement?.() ?? bgAny._element;
  const src = el?.src;
  if (!src) return null;

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return { imageUrls: [src] };
  }
  if (src.startsWith("data:")) {
    const match = src.match(/^data:image\/\w+;base64,(.+)$/);
    const base64 = match ? match[1] : src.replace(/^data:[^;]+;base64,/, "");
    return { base64Images: [base64] };
  }
  return null;
}

import type {
  FabricObjectWithMetadata,
  FabricCanvas,
  ShapeObject,
} from "@/app/(studio)/standalone/studio/types/image-editor-types";

/**
 * Type guard to check if an object is a Fabric image
 */
export function isFabricImage(obj: any): obj is FabricObjectWithMetadata {
  return obj && obj.type === "image";
}

/**
 * Type guard to check if an object is a text object
 */
export function isTextObject(obj: any): obj is FabricObjectWithMetadata {
  return obj && obj.type === "i-text";
}

/**
 * Type guard to check if an object is a shape
 */
export function isShape(obj: any): obj is ShapeObject {
  return obj && obj.isShape === true;
}

/**
 * Type guard to check if an object has metadata
 */
export function hasMetadata(obj: any): obj is FabricObjectWithMetadata {
  return (
    obj &&
    ("isBackground" in obj ||
      "isQR" in obj ||
      "isLogo" in obj ||
      "isEditable" in obj)
  );
}

/**
 * Type guard to check if an object is a QR code
 */
export function isQRCode(obj: any): obj is FabricObjectWithMetadata {
  return obj && obj.isQR === true;
}

/**
 * Type guard to check if an object is a logo
 */
export function isLogo(obj: any): obj is FabricObjectWithMetadata {
  return obj && obj.isLogo === true;
}

/**
 * Type guard to check if an object is the background
 */
export function isBackground(obj: any): obj is FabricObjectWithMetadata {
  return obj && obj.isBackground === true;
}

/**
 * Type guard to check if an object is editable
 */
export function isEditable(obj: any): boolean {
  return obj && obj.isEditable !== false;
}

/**
 * Type guard to check if value is a valid Fabric canvas
 */
export function isFabricCanvas(obj: any): obj is FabricCanvas {
  return (
    obj &&
    typeof obj.getObjects === "function" &&
    typeof obj.renderAll === "function" &&
    typeof obj.add === "function"
  );
}

/**
 * Safe accessor for canvas objects with type checking
 */
export function getCanvasObjects(canvas: any): FabricObjectWithMetadata[] {
  if (!isFabricCanvas(canvas)) {
    return [];
  }
  return canvas.getObjects();
}

/**
 * Safe accessor for active object with type checking
 */
export function getActiveObject(canvas: any): FabricObjectWithMetadata | null {
  if (!isFabricCanvas(canvas)) {
    return null;
  }
  return canvas.getActiveObject();
}

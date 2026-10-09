import type { BrandTemplate, BrandTemplateFabricJson } from "@/lib/brand-templates/types";
import type { BrandFormatPreset } from "@/lib/brand-templates/formats";

export interface ObjectMetadata {
  isBackground?: boolean;
  isQR?: boolean;
  isLogo?: boolean;
  isFrame?: boolean;
  isEditable?: boolean;
}

export interface HistoryEntry {
  overlayJSON: string;
  metadata: Record<number, ObjectMetadata>;
  /** Background image URL for this state; used when undoing/redoing so the correct image is restored. */
  backgroundUrl?: string;
}

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
}

export interface ImageEditorStandaloneParams {
  imageUrl?: string;
  user_id?: string;
  session_id?: string;
  /** Tectonica conversation id, stored on saved versions for traceability. */
  chat_id?: string;
  client_id?: string;
  user_email?: string;
  /** Optional preset texts shown in Text Tools for the user to insert manually. */
  text?: string;
  /** Optional delimiter for splitting `text` into presets (default: `||`). */
  text_delim?: string;
  /** "template-author": admins design a Branding template layout. */
  mode?: string;
  template_id?: string;
  format?: string;
}

/** Loaded server-side (admin only) for `mode=template-author`. */
export interface TemplateAuthorData {
  template: Pick<BrandTemplate, "id" | "name" | "variants">;
  format: BrandFormatPreset;
  /** Saved layout for this format, or null when it's being designed for the first time. */
  layout: BrandTemplateFabricJson | null;
  /** Saved layouts of the other formats, offered as a starting point. */
  otherLayouts: Array<{ format: BrandFormatPreset; layout: BrandTemplateFabricJson }>;
  /** Initial canvas background while authoring (first color variant). */
  backgroundColor: string;
}

export interface CanvasSessionData {
  id: string;
  background_url: string;
  /** Lineage key of the image this version belongs to (null on legacy rows). */
  root_image_url: string | null;
  overlay_json: Record<string, unknown>;
  metadata: Record<number, ObjectMetadata>;
  name: string | null;
}

export interface CanvasSessionSummary {
  id: string;
  name: string | null;
  thumbnail_url: string | null;
  background_url: string;
  created_at: string;
  updated_at: string;
}

export interface LogoAsset {
  url: string;
  display_name: string;
  variant: string | null;
}

export interface FrameAsset {
  url: string;
  display_name: string;
  variant: string | null;
}

export interface FontAsset {
  font_source: "google" | "custom";
  font_family: string;
  font_weights: string[];
  file_url?: string;
  is_brand?: boolean;
  is_primary?: boolean;
}

export interface ImageEditorStandaloneProps {
  params: ImageEditorStandaloneParams;
  logoAssets: LogoAsset[];
  frameAssets?: FrameAsset[];
  fontAssets?: FontAsset[];
  sessionData?: CanvasSessionData | null;
  /** When false, "Upload custom logo" is hidden in Logo overlay. Default true. */
  allowCustomLogo?: boolean;
  /** Present only in template-author mode. */
  templateAuthor?: TemplateAuthorData | null;
}

export type DisclaimerPosition =
  | "top-right"
  | "bottom-right"
  | "top-left"
  | "bottom-left";

export type ExportFormat = "png" | "jpeg" | "webp";

export interface ExportConfig {
  position: DisclaimerPosition;
  format: ExportFormat;
  filename: string;
}

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Extended Fabric.js types with custom metadata
export interface FabricObjectWithMetadata {
  isBackground?: boolean;
  isQR?: boolean;
  isLogo?: boolean;
  isFrame?: boolean;
  isEditable?: boolean;
  type: string;
  getScaledWidth(): number;
  getScaledHeight(): number;
  set(options: any): void;
  setCoords(): void;
}

export interface FabricCanvas {
  width?: number;
  height?: number;
  getObjects(): FabricObjectWithMetadata[];
  getActiveObject(): FabricObjectWithMetadata | null;
  add(object: any): void;
  remove(object: any): void;
  clear(): void;
  renderAll(): void;
  discardActiveObject(): void;
  sendObjectToBack(object: any): void;
  setActiveObject(object: any): void;
  toDataURL(options: {
    format: string;
    quality: number;
    multiplier: number;
  }): string;
  toJSON(extraProperties?: string[]): any;
  loadFromJSON(json: string | any): Promise<void>;
}

export type ShapeType =
  | "rectangle"
  | "square"
  | "circle"
  | "half-circle-right"
  | "half-circle-left"
  | "triangle"
  | "star"
  | "arrow"
  | "diamond"
  | "hexagon"
  | "cross"
  | "rounded-rectangle";

export interface ShapeObject extends FabricObjectWithMetadata {
  isShape: boolean;
  shapeType: ShapeType;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

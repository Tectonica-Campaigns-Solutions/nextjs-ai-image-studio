export interface ObjectMetadata {
  isBackground?: boolean;
  isQR?: boolean;
  isLogo?: boolean;
  isEditable?: boolean;
}

export interface HistoryEntry {
  overlayJSON: string;
  metadata: Record<number, ObjectMetadata>;
}

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
}

export interface ImageEditorStandaloneParams {
  imageUrl?: string;
  user_id?: string;
  session_id?: string;
}

export interface CanvasSessionData {
  id: string;
  background_url: string;
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

export interface FontAsset {
  font_source: "google" | "custom";
  font_family: string;
  font_weights: string[];
  file_url?: string;
}

export interface ImageEditorStandaloneProps {
  params: ImageEditorStandaloneParams;
  logoAssets: LogoAsset[];
  fontAssets?: FontAsset[];
  sessionData?: CanvasSessionData | null;
}

export type DisclaimerPosition =
  | "top-right"
  | "bottom-right"
  | "top-left"
  | "bottom-left";

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

export interface RectObject extends FabricObjectWithMetadata {
  isRect: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

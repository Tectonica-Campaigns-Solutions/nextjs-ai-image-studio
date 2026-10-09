import type { BrandFormatKey, BrandSlotType, BrandTemplateFormat } from "./types";

export interface BrandFormatPreset {
  key: BrandFormatKey;
  label: string;
  /** Short aspect label for chips, e.g. "4:5". */
  ratio: string;
  width: number;
  height: number;
  hint: string;
}

/** Social formats, in display order. Sizes are the export (native) sizes. */
export const BRAND_FORMATS: readonly BrandFormatPreset[] = [
  { key: "square", label: "Square", ratio: "1:1", width: 1080, height: 1080, hint: "Instagram / Facebook post" },
  { key: "portrait", label: "Portrait", ratio: "4:5", width: 1080, height: 1350, hint: "Instagram feed" },
  { key: "story", label: "Story", ratio: "9:16", width: 1080, height: 1920, hint: "Stories / Reels / TikTok" },
  { key: "landscape", label: "Landscape", ratio: "16:9", width: 1200, height: 675, hint: "X / LinkedIn / Facebook link" },
] as const;

export const BRAND_FORMAT_KEYS = BRAND_FORMATS.map((f) => f.key) as BrandFormatKey[];

export function isBrandFormatKey(value: unknown): value is BrandFormatKey {
  return typeof value === "string" && (BRAND_FORMAT_KEYS as string[]).includes(value);
}

export function getBrandFormat(key: BrandFormatKey): BrandFormatPreset {
  return BRAND_FORMATS.find((f) => f.key === key)!;
}

export const BRAND_SLOT_TYPES: readonly { value: BrandSlotType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
  { value: "logo", label: "Logo" },
];

/**
 * Custom fabric props that must survive toJSON / loadFromJSON for templates:
 * slot identity, `templateLayer` (object came from the template layout, not
 * added by the user) and, for filled photo slots, the frame shape and crop.
 */
export const BRAND_SLOT_PROPS = [
  "slotId",
  "slotType",
  "slotLabel",
  "templateLayer",
  "slotShape",
  "slotCrop",
] as const;

/** Background used while authoring when a template has no color variant. */
export const BRAND_DEFAULT_BACKGROUND = "#FFFFFF";

/** The format a template opens in: square when designed, else the first in display order. */
export function pickDefaultFormat(formats: Pick<BrandTemplateFormat, "format_key">[]): BrandFormatKey | null {
  const keys = new Set(formats.map((f) => f.format_key));
  return BRAND_FORMATS.find((f) => keys.has(f.key))?.key ?? null;
}

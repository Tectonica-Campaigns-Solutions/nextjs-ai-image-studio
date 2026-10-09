/**
 * Branding templates — shared by the dashboard (authoring/admin) and the
 * Studio (template mode). Rows live in brand_templates /
 * brand_template_formats (data/migrations/create_brand_templates.sql).
 */

export type BrandFormatKey = "square" | "portrait" | "story" | "landscape";

export type BrandVariantKind = "color" | "image";

export interface BrandTemplateVariant {
  id: string;
  kind: BrandVariantKind;
  /** Hex color for "color", public image URL for "image". */
  value: string;
  label?: string;
}

/** What a slot holds; content is carried between formats by slotId. */
export type BrandSlotType = "text" | "image" | "logo";

/** Photo framing inside an image slot: zoom ≥ 1 and focal point (0..1). */
export interface BrandSlotCrop {
  zoom: number;
  fx: number;
  fy: number;
}

/** Extra props stored on fabric objects that are template slots. */
export interface BrandSlotProps {
  slotId?: string;
  slotType?: BrandSlotType;
  slotLabel?: string;
  /** Set on every object loaded from a template layout (vs. added by the user). */
  templateLayer?: boolean;
  /** Frame shape of a filled photo slot. */
  slotShape?: "rect" | "ellipse";
  slotCrop?: BrandSlotCrop;
}

/** fabric_json column: overlay objects only (the background comes from the variant). */
export interface BrandTemplateFabricJson {
  version?: string;
  objects: Array<Record<string, unknown> & BrandSlotProps>;
}

export interface BrandTemplate {
  id: string;
  client_id: string | null;
  name: string;
  category: string | null;
  description: string | null;
  thumbnail_url: string | null;
  variants: BrandTemplateVariant[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BrandTemplateFormat {
  id: string;
  template_id: string;
  format_key: BrandFormatKey;
  width: number;
  height: number;
  fabric_json: BrandTemplateFabricJson;
  thumbnail_url: string | null;
  updated_at: string;
}

export interface BrandTemplateWithFormats extends BrandTemplate {
  formats: BrandTemplateFormat[];
}

import type { FontAsset } from "../types/image-editor-types";
import {
  CURATED_FONT_GROUPS,
  DEFAULT_CURATED_FONT,
} from "../constants/curated-fonts";
import { normalizeFontCatalogKey } from "./build-google-font-css2-url";

export interface FontPickerOption {
  family: string;
  /** Organization font (already loaded by useEditorFonts under its real name). */
  isOrg: boolean;
  isPrimary: boolean;
  sample?: string;
}

export interface FontPickerGroup {
  id: string;
  label: string;
  options: FontPickerOption[];
}

/** Primary org font, else first brand font, else first org font. */
export function getPrimaryOrgFont(fontAssets: FontAsset[]): FontAsset | undefined {
  return (
    fontAssets.find((f) => f.is_primary) ??
    fontAssets.find((f) => f.is_brand) ??
    fontAssets[0]
  );
}

export function getDefaultFontFamily(fontAssets: FontAsset[]): string {
  return getPrimaryOrgFont(fontAssets)?.font_family || DEFAULT_CURATED_FONT;
}

/**
 * Organization fonts first (primary, then brand, then the rest), followed by the
 * curated style groups. Curated fonts the organization already has are omitted.
 */
export function buildFontPickerGroups(fontAssets: FontAsset[]): FontPickerGroup[] {
  const primary = getPrimaryOrgFont(fontAssets);
  const seen = new Set<string>();
  const orgOptions: FontPickerOption[] = [];

  const ordered = [...fontAssets].sort((a, b) => {
    const rank = (f: FontAsset) => (f === primary ? 0 : f.is_brand ? 1 : 2);
    return rank(a) - rank(b);
  });

  for (const asset of ordered) {
    const key = normalizeFontCatalogKey(asset.font_family);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    orgOptions.push({
      family: asset.font_family,
      isOrg: true,
      isPrimary: asset === primary,
    });
  }

  const groups: FontPickerGroup[] = [];
  if (orgOptions.length > 0) {
    groups.push({ id: "org", label: "Organization fonts", options: orgOptions });
  }

  for (const group of CURATED_FONT_GROUPS) {
    const options = group.fonts
      .filter((f) => !seen.has(normalizeFontCatalogKey(f.family)))
      .map((f) => ({
        family: f.family,
        isOrg: false,
        isPrimary: false,
        sample: f.sample,
      }));
    if (options.length > 0) {
      groups.push({ id: group.id, label: group.label, options });
    }
  }

  return groups;
}

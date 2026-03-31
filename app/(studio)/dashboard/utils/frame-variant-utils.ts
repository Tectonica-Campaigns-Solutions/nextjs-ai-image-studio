/** Parses a frame variant string into structured form for the edit dialog. */
export function parseFrameVariant(variant?: string | null): {
  isAll: boolean;
  ratios: string[];
} {
  if (variant === "*") return { isAll: true, ratios: [] };
  if (variant) {
    return {
      isAll: false,
      ratios: variant.split(",").map((s) => s.trim()).filter(Boolean),
    };
  }
  return { isAll: false, ratios: [] };
}

/** Returns display badge strings for a frame variant value. */
export function getVariantBadges(variant?: string | null): string[] {
  if (variant === "*") return ["All"];
  if (variant) return variant.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

/**
 * Shared aspect ratio config for frames: dashboard upload, API validation, and studio display.
 */

export const COMMON_ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 — Landscape HD (1920×1080)" },
  { value: "9:16", label: "9:16 — Portrait / Stories (1080×1920)" },
  { value: "1:1", label: "1:1 — Square (1080×1080)" },
  { value: "4:3", label: "4:3 — Classic landscape (1024×768)" },
  { value: "3:4", label: "3:4 — Classic portrait (768×1024)" },
  { value: "4:5", label: "4:5 — Instagram portrait (1080×1350)" },
  { value: "5:4", label: "5:4 — Instagram landscape (1350×1080)" },
  { value: "3:2", label: "3:2 — DSLR landscape (1500×1000)" },
  { value: "2:3", label: "2:3 — DSLR portrait (1000×1500)" },
  { value: "21:9", label: "21:9 — Ultrawide (2560×1080)" },
] as const;

export const VALID_ASPECT_RATIO_VALUES = new Set(
  COMMON_ASPECT_RATIOS.map((r) => r.value)
);

/** Display label for studio frame panel, e.g. "Instagram Story (9:16, 1080×1920)" */
const ASPECT_RATIO_DISPLAY: Record<string, string> = {
  "16:9": "Landscape HD (16:9, 1920×1080)",
  "9:16": "Instagram Story (9:16, 1080×1920)",
  "1:1": "Square (1:1, 1080×1080)",
  "4:3": "Classic landscape (4:3, 1024×768)",
  "3:4": "Classic portrait (3:4, 768×1024)",
  "4:5": "Instagram portrait (4:5, 1080×1350)",
  "5:4": "Instagram landscape (5:4, 1350×1080)",
  "3:2": "DSLR landscape (3:2, 1500×1000)",
  "2:3": "DSLR portrait (2:3, 1000×1500)",
  "21:9": "Ultrawide (21:9, 2560×1080)",
};

export function getAspectRatioDisplayLabel(aspectRatio: string | null): string | null {
  if (!aspectRatio) return null;
  return ASPECT_RATIO_DISPLAY[aspectRatio] ?? null;
}

/** Options for "Show by size" in the studio frame tool. Order: Instagram Story, Square, Facebook, etc., then All. */
export const FRAME_SHOW_BY_SIZE_OPTIONS = [
  { value: "9:16", label: "Instagram Story (9:16, 1080×1920)" },
  { value: "1:1", label: "Instagram Square (1:1, 1080×1080)" },
  { value: "4:5", label: "Facebook / Instagram portrait (4:5, 1080×1350)" },
  { value: "5:4", label: "Instagram landscape (5:4, 1350×1080)" },
  { value: "16:9", label: "Landscape HD (16:9, 1920×1080)" },
  { value: "4:3", label: "Classic landscape (4:3, 1024×768)" },
  { value: "3:4", label: "Classic portrait (3:4, 768×1024)" },
  { value: "3:2", label: "DSLR landscape (3:2, 1500×1000)" },
  { value: "2:3", label: "DSLR portrait (2:3, 1000×1500)" },
  { value: "21:9", label: "Ultrawide (21:9, 2560×1080)" },
  { value: "all", label: "All" },
] as const;

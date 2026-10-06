import type { GoogleFontCatalogEntry } from "../types/google-font-catalog";

/**
 * A curated Google font offered in the Text Tools picker. Weight/style metadata
 * mirrors Fontsource so the css2 URL is correct even before the full catalog loads.
 */
export interface CuratedFont extends GoogleFontCatalogEntry {
  /**
   * Sample glyphs shown next to the name for fonts whose own glyphs can't
   * render their name legibly (emoji, symbols, redacted).
   */
  sample?: string;
}

export interface CuratedFontGroup {
  id: string;
  label: string;
  /** First font is the group's featured font. */
  fonts: CuratedFont[];
}

const font = (
  family: string,
  weights: number[],
  styles: string[],
  variable = false,
  sample?: string,
): CuratedFont => ({ family, weights, styles, variable, sample });

const N = ["normal"];
const NI = ["italic", "normal"];
const ALL = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export const CURATED_FONT_GROUPS: CuratedFontGroup[] = [
  {
    id: "sans",
    label: "Sans",
    fonts: [
      font("DM Sans", ALL, NI, true),
      font("Poppins", ALL, NI),
      font("Lato", [100, 300, 400, 700, 900], NI),
      font("Ubuntu", [300, 400, 500, 700], NI),
      font("Fira Sans", ALL, NI),
      font("Montserrat", ALL, NI, true),
      font("Barlow", ALL, NI),
      font("IBM Plex Sans", [100, 200, 300, 400, 500, 600, 700], NI, true),
      font("Oxygen", [300, 400, 700], N),
      font("Alegreya Sans", [100, 300, 400, 500, 700, 800, 900], NI),
    ],
  },
  {
    id: "serif",
    label: "Serif",
    fonts: [
      font("Merriweather", [300, 400, 500, 600, 700, 800, 900], NI, true),
      font("Lora", [400, 500, 600, 700], NI, true),
      font("Libre Baskerville", [400, 500, 600, 700], NI, true),
      font("Instrument Serif", [400], NI),
      font("DM Serif Display", [400], NI),
      font("Alfa Slab One", [400], N),
      font("Cinzel", [400, 500, 600, 700, 800, 900], N, true),
      font("Arvo", [400, 700], NI),
      font("Gravitas One", [400], N),
      font("Alegreya", [400, 500, 600, 700, 800, 900], NI, true),
    ],
  },
  {
    id: "handwritten",
    label: "Handwritten",
    fonts: [
      font("Permanent Marker", [400], N),
      font("Caveat Brush", [400], N),
      font("Pangolin", [400], N),
      font("Playpen Sans", [100, 200, 300, 400, 500, 600, 700, 800], N, true),
      font("Boogaloo", [400], N),
    ],
  },
  {
    id: "grotesque",
    label: "Grotesque",
    fonts: [
      font("Oswald", [200, 300, 400, 500, 600, 700], N, true),
      font("League Gothic", [400], N, true),
      font("Staatliches", [400], N),
      font("Boldonse", [400], N),
      // Impact is a proprietary system font (not on Google Fonts); Anton is its open equivalent.
      font("Anton", [400], N),
    ],
  },
  {
    id: "symbols",
    label: "Emojis & Symbols",
    fonts: [
      font("Noto Color Emoji", [400], N, false, "😀 🎉 ❤️ 👍"),
      font("Redacted Script", [300, 400, 700], N, false, "Lorem ipsum"),
      font("Noto Sans Symbols", ALL, N, true, "☀ ☂ ☯ ♞ ⚑"),
    ],
  },
];

/** Default text font when the organization has no fonts of its own. */
export const DEFAULT_CURATED_FONT = CURATED_FONT_GROUPS[0].fonts[0].family;

export const CURATED_FONTS: CuratedFont[] = CURATED_FONT_GROUPS.flatMap((g) => g.fonts);

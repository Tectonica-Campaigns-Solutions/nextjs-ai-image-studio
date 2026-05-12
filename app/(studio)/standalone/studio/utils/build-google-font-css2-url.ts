import type { GoogleFontCatalogEntry } from "../types/google-font-catalog";

function closestWeight(weights: number[], target: number): number {
  if (weights.length === 0) return 400;
  let best = weights[0];
  let bestDist = Math.abs(best - target);
  for (const w of weights) {
    const d = Math.abs(w - target);
    if (d < bestDist || (d === bestDist && w > best)) {
      best = w;
      bestDist = d;
    }
  }
  return best;
}

function uniqueSorted(weights: number[]): number[] {
  return [...new Set(weights)].sort((a, b) => a - b);
}

/**
 * Build a Google Fonts CSS2 stylesheet URL that includes regular/bold (and italic when the font supports it)
 * so toggling styles in the editor does not require a new fetch for each toggle.
 */
export function buildGoogleCss2Url(
  family: string,
  entry: GoogleFontCatalogEntry | null | undefined,
): string {
  const familyParam = family.trim().replace(/\s+/g, "+");
  const display = "display=swap";

  if (!entry) {
    return `https://fonts.googleapis.com/css2?family=${familyParam}:ital,wght@0,400;0,700;1,400;1,700&${display}`;
  }

  const weights = uniqueSorted(entry.weights.filter((n) => Number.isFinite(n)));
  const hasItalic = entry.styles.includes("italic");
  const wMin = weights[0] ?? 400;
  const wMax = weights[weights.length - 1] ?? 700;
  const w400 = weights.includes(400) ? 400 : closestWeight(weights, 400);
  const w700 = weights.includes(700) ? 700 : closestWeight(weights, 700);

  if (entry.variable) {
    if (hasItalic) {
      return `https://fonts.googleapis.com/css2?family=${familyParam}:ital,wght@0,${wMin}..${wMax};1,${wMin}..${wMax}&${display}`;
    }
    return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${wMin}..${wMax}&${display}`;
  }

  if (hasItalic) {
    const pairs = new Set<string>();
    pairs.add(`0,${w400}`);
    pairs.add(`0,${w700}`);
    pairs.add(`1,${w400}`);
    pairs.add(`1,${w700}`);
    const axis = [...pairs].sort().join(";");
    return `https://fonts.googleapis.com/css2?family=${familyParam}:ital,wght@${axis}&${display}`;
  }

  const uniqW = uniqueSorted([w400, w700]);
  const wght = uniqW.join(";");
  return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${wght}&${display}`;
}

export function normalizeFontCatalogKey(name: string): string {
  return name.trim().toLowerCase();
}

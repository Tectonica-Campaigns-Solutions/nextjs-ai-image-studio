import { Textbox } from "fabric";
import type { Canvas } from "fabric";

export const DEFAULT_TEXT_BLOCK_DELIMITER = "||";

export function parseTextBlocks(
  raw: string | null | undefined,
  delimiter: string = DEFAULT_TEXT_BLOCK_DELIMITER,
): string[] {
  const value = (raw ?? "").trim();
  if (!value) return [];

  const delim = (delimiter || DEFAULT_TEXT_BLOCK_DELIMITER).trim();
  if (!delim) return [value];

  return value
    .split(delim)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type AutoTextLayoutOptions = {
  /** When true, tries to shrink the textbox width to fit the input text. */
  adaptiveWidth?: boolean;
  minWidthPx?: number;
  maxWidthPx?: number;
  widthRatio?: number;
  gapPx?: number;
  initialFontSize?: number;
  minFontSize?: number;
  maxHeightRatio?: number;
  textAlign?: "left" | "center" | "right";
  /**
   * Extra Fabric Textbox options (fill, fontFamily, etc). Intentionally partial;
   * we override placement-related properties.
   */
  textboxOptions?: Partial<ConstructorParameters<typeof Textbox>[1]>;
};

function measureTextboxHeight(tb: Textbox): number {
  // initDimensions updates tb.height based on wrapping + font metrics
  tb.initDimensions();
  const h =
    typeof tb.getScaledHeight === "function"
      ? tb.getScaledHeight()
      : (tb.height ?? 0);
  return Number.isFinite(h) ? h : 0;
}

function computeBlockWidth(
  canvas: Canvas,
  opts: AutoTextLayoutOptions,
): number {
  const cw = canvas.width ?? 0;
  const minWidthPx =
    typeof opts.minWidthPx === "number" ? opts.minWidthPx : 120;
  const widthRatio =
    typeof opts.widthRatio === "number" ? opts.widthRatio : 0.85;
  const maxWidthPx =
    typeof opts.maxWidthPx === "number" ? opts.maxWidthPx : 900;
  const base = cw > 0 ? cw * widthRatio : maxWidthPx;
  return Math.max(minWidthPx, Math.min(base, maxWidthPx));
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(n, max));
}

function getCanvasTextContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  return canvas.getContext("2d");
}

function buildCssFontString(
  fontStyle: unknown,
  fontWeight: unknown,
  fontSize: unknown,
  fontFamily: unknown,
): string {
  const style = typeof fontStyle === "string" && fontStyle ? fontStyle : "normal";
  const weight =
    (typeof fontWeight === "string" && fontWeight) ||
    (typeof fontWeight === "number" && Number.isFinite(fontWeight) ? String(fontWeight) : "normal");
  const size =
    typeof fontSize === "number" && Number.isFinite(fontSize)
      ? `${fontSize}px`
      : "28px";
  const family = typeof fontFamily === "string" && fontFamily ? fontFamily : "sans-serif";
  return `${style} ${weight} ${size} ${family}`;
}

function estimateAdaptiveWidthPx(
  text: string,
  textboxOptions: AutoTextLayoutOptions["textboxOptions"],
  fontSize: number,
): number | null {
  const ctx = getCanvasTextContext();
  if (!ctx) return null;

  ctx.font = buildCssFontString(
    textboxOptions?.fontStyle,
    textboxOptions?.fontWeight,
    fontSize,
    textboxOptions?.fontFamily,
  );

  const lines = text.split("\n");
  let maxLine = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxLine) maxLine = w;
  }

  if (!Number.isFinite(maxLine) || maxLine <= 0) return null;

  // Padding so the word doesn't hug edges.
  const horizontalPadding = 32;
  return maxLine + horizontalPadding;
}

function fitTextboxToMaxHeight(
  tb: Textbox,
  maxHeight: number,
  initialFontSize: number,
  minFontSize: number,
): { fittedFontSize: number; height: number } {
  let fs = initialFontSize;
  tb.set({ fontSize: fs });
  let h = measureTextboxHeight(tb);

  while (h > maxHeight && fs > minFontSize) {
    fs = Math.max(minFontSize, fs - 2);
    tb.set({ fontSize: fs });
    h = measureTextboxHeight(tb);
    if (fs === minFontSize) break;
  }

  return { fittedFontSize: fs, height: h };
}

/**
 * Inserts text blocks as editable Fabric Textboxes, stacked vertically and centered.
 * Returns the created Textbox objects (in insertion order).
 */
export function insertAutoTextBlocks(
  canvas: Canvas,
  blocks: string[],
  opts: AutoTextLayoutOptions = {},
): Textbox[] {
  if (!canvas || blocks.length === 0) return [];

  const cw = canvas.width ?? 0;
  const ch = canvas.height ?? 0;
  if (cw <= 0 || ch <= 0) return [];

  const maxWidth = computeBlockWidth(canvas, opts);
  const minWidth = typeof opts.minWidthPx === "number" ? opts.minWidthPx : 120;
  const gapPx = typeof opts.gapPx === "number" ? opts.gapPx : 14;
  const initialFontSize =
    typeof opts.initialFontSize === "number" ? opts.initialFontSize : 28;
  const minFontSize =
    typeof opts.minFontSize === "number" ? opts.minFontSize : 12;
  const maxHeightRatio =
    typeof opts.maxHeightRatio === "number" ? opts.maxHeightRatio : 0.7;
  const textAlign = opts.textAlign ?? "center";
  const adaptiveWidth = opts.adaptiveWidth !== false;

  // Height budget: allow blocks to share vertical space.
  const totalMaxHeight = Math.max(60, ch * maxHeightRatio);
  const perBlockMaxHeight =
    blocks.length === 1
      ? totalMaxHeight
      : Math.max(
          40,
          (totalMaxHeight - gapPx * (blocks.length - 1)) / blocks.length,
        );

  // Create textboxes off-canvas first to measure them.
  const created: Array<{ tb: Textbox; height: number }> = blocks.map((text) => {
    const desiredWidth =
      adaptiveWidth
        ? estimateAdaptiveWidthPx(text, opts.textboxOptions, initialFontSize)
        : null;
    const width = desiredWidth ? clamp(desiredWidth, minWidth, maxWidth) : maxWidth;

    const tb = new Textbox(text, {
      left: 0,
      top: 0,
      width,
      textAlign,
      editable: true,
      selectable: true,
      splitByGrapheme: false,
      ...opts.textboxOptions,
    });
    (tb as any).isEditable = true;

    const { height } = fitTextboxToMaxHeight(
      tb,
      perBlockMaxHeight,
      initialFontSize,
      minFontSize,
    );
    return { tb, height };
  });

  const totalHeight =
    created.reduce((sum, item) => sum + item.height, 0) +
    gapPx * Math.max(0, created.length - 1);
  const topStart = Math.max(0, (ch - totalHeight) / 2);

  let top = topStart;
  for (const item of created) {
    const itemWidth =
      typeof item.tb.getScaledWidth === "function"
        ? item.tb.getScaledWidth()
        : (item.tb.width ?? maxWidth);
    const left = Math.max(0, (cw - itemWidth) / 2);
    item.tb.set({
      left,
      top,
    });
    item.tb.setCoords();
    canvas.add(item.tb);
    top += item.height + gapPx;
  }

  canvas.renderAll();
  return created.map((c) => c.tb);
}

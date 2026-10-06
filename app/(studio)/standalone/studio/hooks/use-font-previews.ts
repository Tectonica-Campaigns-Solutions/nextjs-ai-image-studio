"use client";

import { useEffect } from "react";
import { CURATED_FONTS } from "../constants/curated-fonts";

const PREVIEW_PREFIX = "__font_preview__ ";

/**
 * Preview faces are registered under an alias so the name-only subset never
 * shadows the full font the canvas uses for the same family.
 */
export function getPreviewFontFamily(family: string): string {
  return `"${PREVIEW_PREFIX}${family}", "${family}", system-ui, sans-serif`;
}

function buildPreviewCssUrl(): string {
  const families = CURATED_FONTS.map(
    (f) => `family=${encodeURIComponent(f.family).replace(/%20/g, "+")}`,
  ).join("&");
  const chars = new Set<string>();
  for (const f of CURATED_FONTS) {
    for (const ch of f.family + (f.sample ?? "")) chars.add(ch);
  }
  const text = encodeURIComponent([...chars].join(""));
  return `https://fonts.googleapis.com/css2?${families}&text=${text}&display=swap`;
}

let previewLoad: Promise<void> | null = null;

async function loadPreviewFonts(): Promise<void> {
  if (typeof FontFace === "undefined" || !document.fonts) return;
  const res = await fetch(buildPreviewCssUrl());
  if (!res.ok) throw new Error(`Font preview CSS HTTP ${res.status}`);
  const css = await res.text();

  const faces: FontFace[] = [];
  for (const [, block] of css.matchAll(/@font-face\s*{([^}]*)}/g)) {
    const family = /font-family:\s*['"]?([^;'"]+)['"]?;/.exec(block)?.[1];
    const src = /src:\s*(url\([^)]+\)[^;]*);/.exec(block)?.[1];
    if (!family || !src) continue;
    const weight = /font-weight:\s*([^;]+);/.exec(block)?.[1]?.trim();
    const style = /font-style:\s*([^;]+);/.exec(block)?.[1]?.trim();
    faces.push(
      new FontFace(`${PREVIEW_PREFIX}${family}`, src, {
        weight: weight ?? "400",
        style: style ?? "normal",
        display: "swap",
      }),
    );
  }

  await Promise.allSettled(
    faces.map(async (face) => {
      document.fonts.add(await face.load());
    }),
  );
}

/** Loads name-only subsets of every curated font the first time `enabled` is true. */
export function useFontPreviews(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || previewLoad) return;
    previewLoad = loadPreviewFonts().catch((e) => {
      console.warn("[font-previews]", e);
      previewLoad = null;
    });
  }, [enabled]);
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { Canvas, FabricObject } from "fabric";
import type { FontAsset } from "../types/image-editor-types";
import type { GoogleFontCatalogEntry } from "../types/google-font-catalog";
import { BUNDLED_FONT_CSS_VARS } from "../constants/editor-constants";
import {
  buildGoogleCss2Url,
  normalizeFontCatalogKey,
} from "../utils/build-google-font-css2-url";

const LINK_ATTR = "data-editor-dynamic-google-font";

interface FontRequest {
  family: string;
  weight: string;
  style: "normal" | "italic";
}

export interface UseDynamicGoogleFontsOptions {
  canvas: Canvas | null;
  /** Font currently chosen in Text Tools. */
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
  fontAssets: FontAsset[];
  /** Keys: normalizeFontCatalogKey(family) */
  catalogByFamily: Map<string, GoogleFontCatalogEntry> | null;
  onFontSettled?: () => void;
}

function isBundledFontFamily(family: string): boolean {
  const key = normalizeFontCatalogKey(family);
  return Object.keys(BUNDLED_FONT_CSS_VARS).some(
    (name) => normalizeFontCatalogKey(name) === key,
  );
}

function isCustomAssetFamily(family: string, fontAssets: FontAsset[]): boolean {
  const key = normalizeFontCatalogKey(family);
  return fontAssets.some(
    (f) =>
      f.font_source === "custom" &&
      normalizeFontCatalogKey(f.font_family) === key,
  );
}

/** First family of a CSS font stack, e.g. `"Lora", "Manrope", sans-serif` → `Lora`. */
function getPrimaryFamily(fontFamily: string): string {
  const first = fontFamily?.split(",")[0] ?? "";
  return first.trim().replace(/^["']|["']$/g, "");
}

function normalizeWeight(weight: unknown): string {
  if (weight === "bold") return "700";
  if (weight === "normal" || weight == null || weight === "") return "400";
  return String(weight);
}

function requestKey(req: FontRequest): string {
  return `${req.style} ${req.weight} 16px "${req.family}"`;
}

function collectTextFonts(objects: FabricObject[], out: FontRequest[]): void {
  for (const obj of objects as any[]) {
    if (typeof obj?.getObjects === "function") {
      collectTextFonts(obj.getObjects(), out);
    } else if (typeof obj?.fontFamily === "string") {
      const family = getPrimaryFamily(obj.fontFamily);
      if (!family) continue;
      out.push({
        family,
        weight: normalizeWeight(obj.fontWeight),
        style: obj.fontStyle === "italic" ? "italic" : "normal",
      });
    }
  }
}

function waitForStylesheet(link: HTMLLinkElement): Promise<void> {
  if (link.sheet) return Promise.resolve();
  return new Promise((resolve) => {
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => resolve(), { once: true });
  });
}

/**
 * Loads every Google font used on the canvas (plus the one active in Text Tools).
 * Each family gets its own stylesheet that stays in place, so switching one text
 * box's font never unloads the font another text box (or an export) depends on.
 * Bundled (next/font) and custom @font-face assets are skipped.
 */
export function useDynamicGoogleFonts({
  canvas,
  fontFamily,
  isBold,
  isItalic,
  fontAssets,
  catalogByFamily,
  onFontSettled,
}: UseDynamicGoogleFontsOptions): void {
  const [canvasFonts, setCanvasFonts] = useState<FontRequest[]>([]);
  const linksRef = useRef(new Map<string, HTMLLinkElement>());
  const requestedRef = useRef(new Set<string>());

  useEffect(() => {
    const links = linksRef.current;
    const requested = requestedRef.current;
    return () => {
      for (const link of links.values()) link.remove();
      links.clear();
      requested.clear();
    };
  }, []);

  // Track fonts of text added to the canvas (new boxes, pasted copies, restored sessions, undo/redo).
  useEffect(() => {
    if (!canvas) return;
    const sync = () => {
      const found: FontRequest[] = [];
      collectTextFonts(canvas.getObjects(), found);
      setCanvasFonts((prev) => {
        const known = new Set(prev.map(requestKey));
        const added = found.filter((req) => {
          const key = requestKey(req);
          if (known.has(key)) return false;
          known.add(key);
          return true;
        });
        return added.length > 0 ? [...prev, ...added] : prev;
      });
    };
    sync();
    canvas.on("object:added", sync);
    return () => {
      canvas.off("object:added", sync);
    };
  }, [canvas]);

  useEffect(() => {
    const notify = () => {
      queueMicrotask(() => onFontSettled?.());
    };

    const requests: FontRequest[] = [
      ...canvasFonts,
      {
        family: getPrimaryFamily(fontFamily),
        weight: isBold ? "700" : "400",
        style: isItalic ? "italic" : "normal",
      },
    ];

    for (const req of requests) {
      const familyKey = normalizeFontCatalogKey(req.family);
      if (!familyKey || isBundledFontFamily(req.family) || isCustomAssetFamily(req.family, fontAssets)) {
        continue;
      }
      // Only known Google families: avoids requests for next/font aliases or system fonts.
      const entry = catalogByFamily?.get(familyKey);
      if (!entry) continue;

      let link = linksRef.current.get(familyKey);
      if (!link) {
        link = document.createElement("link");
        link.rel = "stylesheet";
        link.setAttribute(LINK_ATTR, familyKey);
        link.href = buildGoogleCss2Url(entry.family, entry);
        document.head.appendChild(link);
        linksRef.current.set(familyKey, link);
      }

      const descriptor = requestKey({ ...req, family: entry.family });
      if (requestedRef.current.has(descriptor)) continue;
      requestedRef.current.add(descriptor);

      void waitForStylesheet(link)
        .then(() =>
          typeof document.fonts?.load === "function"
            ? document.fonts.load(descriptor)
            : undefined,
        )
        .catch(() => undefined)
        .finally(notify);
    }
  }, [canvasFonts, fontFamily, isBold, isItalic, fontAssets, catalogByFamily, onFontSettled]);
}

"use client";

import { useEffect, useRef } from "react";
import type { FontAsset } from "../types/image-editor-types";
import type { GoogleFontCatalogEntry } from "../types/google-font-catalog";
import { BUNDLED_FONT_CSS_VARS } from "../constants/editor-constants";
import {
  buildGoogleCss2Url,
  normalizeFontCatalogKey,
} from "../utils/build-google-font-css2-url";

const LINK_SELECTOR = 'link[data-editor-dynamic-google-font="true"]';

export interface UseDynamicGoogleFontOptions {
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

function getPrimaryFamily(fontFamily: string): string {
  return fontFamily?.trim().replace(/^["']|["']$/g, "") || "";
}

/**
 * Injects a single stylesheet link for the active Google font when it is not
 * bundled (next/font) or a custom @font-face asset.
 */
export function useDynamicGoogleFont({
  fontFamily,
  isBold,
  isItalic,
  fontAssets,
  catalogByFamily,
  onFontSettled,
}: UseDynamicGoogleFontOptions): void {
  const hrefRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      document.querySelector(LINK_SELECTOR)?.remove();
      hrefRef.current = null;
    };
  }, []);

  useEffect(() => {
    const primary = getPrimaryFamily(fontFamily);
    const notify = () => {
      queueMicrotask(() => onFontSettled?.());
    };

    if (!primary || isBundledFontFamily(primary) || isCustomAssetFamily(primary, fontAssets)) {
      document.querySelector(LINK_SELECTOR)?.remove();
      hrefRef.current = null;
      return;
    }

    const entry =
      catalogByFamily?.get(normalizeFontCatalogKey(primary)) ?? undefined;
    const href = buildGoogleCss2Url(primary, entry);

    let link = document.querySelector(LINK_SELECTOR) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.setAttribute("data-editor-dynamic-google-font", "true");
      document.head.appendChild(link);
    }

    if (hrefRef.current === href) {
      return;
    }
    hrefRef.current = href;

    const onLoad = () => notify();
    link.addEventListener("load", onLoad, { once: true });
    link.addEventListener("error", onLoad, { once: true });
    link.href = href;
  }, [fontFamily, fontAssets, catalogByFamily, onFontSettled]);

  useEffect(() => {
    const primary = getPrimaryFamily(fontFamily);
    if (!primary || isBundledFontFamily(primary) || isCustomAssetFamily(primary, fontAssets)) {
      return;
    }

    const notify = () => {
      queueMicrotask(() => onFontSettled?.());
    };

    if (typeof document.fonts?.load !== "function") {
      notify();
      return;
    }

    const weight = isBold ? "700" : "400";
    const style = isItalic ? "italic" : "normal";
    void document.fonts
      .load(`${style} ${weight} 16px "${primary}"`)
      .then(notify)
      .catch(notify);
  }, [
    fontFamily,
    isBold,
    isItalic,
    fontAssets,
    catalogByFamily,
    onFontSettled,
  ]);
}

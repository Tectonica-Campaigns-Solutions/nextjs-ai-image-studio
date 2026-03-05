"use client";

import { useEffect, useState } from "react";
import { getGoogleFontsUrl, generateFontFaceCSS } from "../utils/studio-utils";
import type { FontAsset } from "../types/image-editor-types";

const FONT_LOAD_TIMEOUT_MS = 10000;

export interface UseEditorFontsOptions {
  onFontsLoaded?: () => void;
}

export function useEditorFonts(
  fontAssets: FontAsset[],
  options?: UseEditorFontsOptions
) {
  const [fontsReady, setFontsReady] = useState(
    () => fontAssets.length === 0
  );
  const onFontsLoaded = options?.onFontsLoaded;

  useEffect(() => {
    if (fontAssets.length === 0) {
      setFontsReady(true);
      return;
    }

    setFontsReady(false);

    const googleFonts = fontAssets.filter((f) => f.font_source === "google");
    const customFonts = fontAssets.filter((f) => f.font_source === "custom");

    // Remove any previous preload links we added
    document
      .querySelectorAll(
        "link[data-google-fonts-preload], link[data-custom-font-preload]"
      )
      .forEach((el) => el.remove());

    if (googleFonts.length > 0) {
      const googleFontsData = googleFonts.map((font) => ({
        family: font.font_family,
        weights: font.font_weights || ["400"],
      }));
      const googleFontsUrl = getGoogleFontsUrl(googleFontsData);

      if (googleFontsUrl) {
        const preloadLink = document.createElement("link");
        preloadLink.rel = "preload";
        preloadLink.href = googleFontsUrl;
        preloadLink.as = "style";
        preloadLink.setAttribute("data-google-fonts-preload", "true");
        document.head.appendChild(preloadLink);

        let linkElement = document.querySelector(
          `link[data-google-fonts]`
        ) as HTMLLinkElement;
        if (!linkElement) {
          linkElement = document.createElement("link");
          linkElement.rel = "stylesheet";
          linkElement.setAttribute("data-google-fonts", "true");
          document.head.appendChild(linkElement);
        }
        linkElement.href = googleFontsUrl;
      }
    }

    if (customFonts.length > 0) {
      const firstCustom = customFonts[0];
      if (firstCustom?.file_url) {
        const preloadLink = document.createElement("link");
        preloadLink.rel = "preload";
        preloadLink.href = firstCustom.file_url;
        preloadLink.as = "font";
        preloadLink.setAttribute("crossorigin", "anonymous");
        preloadLink.setAttribute("data-custom-font-preload", "true");
        document.head.appendChild(preloadLink);
      }

      let styleElement = document.querySelector(
        `style[data-custom-fonts]`
      ) as HTMLStyleElement;
      if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.setAttribute("data-custom-fonts", "true");
        document.head.appendChild(styleElement);
      }

      const fontFaceCSS = customFonts
        .map((font) => {
          if (!font.file_url) return "";
          return font.font_weights
            .map((weight) =>
              generateFontFaceCSS(font.font_family, font.file_url!, weight)
            )
            .join("\n");
        })
        .filter(Boolean)
        .join("\n");

      styleElement.textContent = fontFaceCSS;
    }

    if (typeof document.fonts?.load !== "function") {
      setFontsReady(true);
      onFontsLoaded?.();
      return;
    }

    const descriptors = fontAssets.map((f) => `16px "${f.font_family}"`);
    const loadPromises = descriptors.map((d) => document.fonts.load(d));
    const timeoutPromise = new Promise<void>((resolve) =>
      setTimeout(resolve, FONT_LOAD_TIMEOUT_MS)
    );

    Promise.race([Promise.all(loadPromises), timeoutPromise])
      .then(() => {
        setFontsReady(true);
        onFontsLoaded?.();
      })
      .catch(() => {
        setFontsReady(true);
        onFontsLoaded?.();
      });
  }, [fontAssets, onFontsLoaded]);

  return { fontsReady };
}

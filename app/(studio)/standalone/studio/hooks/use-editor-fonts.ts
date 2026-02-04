"use client";

import { useEffect } from "react";
import { getGoogleFontsUrl, generateFontFaceCSS } from "../utils/studio-utils";
import type { FontAsset } from "../types/image-editor-types";

export function useEditorFonts(fontAssets: FontAsset[]) {
  useEffect(() => {
    if (fontAssets.length === 0) return;

    const googleFonts = fontAssets.filter((f) => f.font_source === "google");
    const customFonts = fontAssets.filter((f) => f.font_source === "custom");

    if (googleFonts.length > 0) {
      const googleFontsData = googleFonts.map((font) => ({
        family: font.font_family,
        weights: font.font_weights || ["400"],
      }));
      const googleFontsUrl = getGoogleFontsUrl(googleFontsData);

      if (googleFontsUrl) {
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
  }, [fontAssets]);
}

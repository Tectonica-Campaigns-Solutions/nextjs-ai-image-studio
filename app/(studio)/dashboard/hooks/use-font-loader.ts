"use client";

import { useEffect } from "react";
import type { ClientFont } from "@/app/(studio)/dashboard/utils/types";
import {
  generateFontFaceCSS,
  getGoogleFontsUrl,
} from "@/app/(studio)/standalone/studio/utils/studio-utils";

/**
 * Injects Google Fonts `<link>` and custom `@font-face` styles into the
 * document head so that font previews render in the correct typeface.
 */
export function useFontLoader(fonts: ClientFont[]) {
  useEffect(() => {
    const googleFonts = fonts.filter((f) => f.font_source === "google");
    const customFonts = fonts.filter((f) => f.font_source === "custom");

    if (googleFonts.length > 0) {
      const googleFontsData = googleFonts.map((f) => ({
        family: f.font_family,
        weights: f.font_weights?.length > 0 ? f.font_weights : ["400"],
      }));
      const googleFontsUrl = getGoogleFontsUrl(googleFontsData);

      if (googleFontsUrl) {
        let link = document.querySelector(
          `link[data-google-fonts]`
        ) as HTMLLinkElement | null;

        if (!link) {
          link = document.createElement("link");
          link.rel = "stylesheet";
          link.setAttribute("data-google-fonts", "true");
          document.head.appendChild(link);
        }

        link.href = googleFontsUrl;
      }
    }

    if (customFonts.length > 0) {
      let style = document.querySelector(
        `style[data-custom-fonts]`
      ) as HTMLStyleElement | null;

      if (!style) {
        style = document.createElement("style");
        style.setAttribute("data-custom-fonts", "true");
        document.head.appendChild(style);
      }

      const fontFaceCSS = customFonts
        .map((font) => {
          if (!font.file_url) return "";
          const weights =
            font.font_weights && font.font_weights.length > 0
              ? font.font_weights
              : ["400"];

          return weights
            .map((weight) =>
              generateFontFaceCSS(
                font.font_family,
                font.file_url as string,
                weight
              )
            )
            .join("\n");
        })
        .filter(Boolean)
        .join("\n");

      style.textContent = fontFaceCSS;
    }
  }, [fonts]);
}

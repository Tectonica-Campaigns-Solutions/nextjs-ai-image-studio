"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AssetGallery } from "./asset-gallery";
import { FrameGallery } from "./frame-gallery";
import { FontGallery } from "./font-gallery";
import { CanvasSessionGallery } from "./CanvasSessionGallery";
import { getGoogleFontsUrl, generateFontFaceCSS } from "../../standalone/studio/utils/studio-utils";
import type { ClientDetailGalleriesData } from "@/app/(studio)/dashboard/data/clients";

interface ClientDetailGalleriesProps {
  clientId: string;
  variants: string[];
  data: ClientDetailGalleriesData;
  showOnly?: "assets" | "rest" | "all";
}

export function ClientDetailGalleries({
  clientId,
  variants,
  data,
  showOnly = "all",
}: ClientDetailGalleriesProps) {
  const router = useRouter();
  const onRefresh = () => router.refresh();

  const shouldLoadFonts =
    data.fonts.length > 0 && (showOnly === "rest" || showOnly === "all");

  useEffect(() => {
    if (!shouldLoadFonts) return;

    const googleFonts = data.fonts.filter((f) => f.font_source === "google");
    const customFonts = data.fonts.filter((f) => f.font_source === "custom");

    if (googleFonts.length > 0) {
      const googleFontsData = googleFonts.map((f) => ({
        family: f.font_family,
        weights: f.font_weights || ["400"],
      }));
      const googleFontsUrl = getGoogleFontsUrl(googleFontsData);
      if (googleFontsUrl) {
        let link = document.querySelector(`link[data-google-fonts]`) as HTMLLinkElement;
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
      let style = document.querySelector(`style[data-custom-fonts]`) as HTMLStyleElement;
      if (!style) {
        style = document.createElement("style");
        style.setAttribute("data-custom-fonts", "true");
        document.head.appendChild(style);
      }
      const fontFaceCSS = customFonts
        .map((font) => {
          if (!font.file_url) return "";
          return (font.font_weights || [])
            .map((weight: string) =>
              generateFontFaceCSS(font.font_family, font.file_url!, weight)
            )
            .join("\n");
        })
        .filter(Boolean)
        .join("\n");
      style.textContent = fontFaceCSS;
    }
  }, [shouldLoadFonts, data.fonts]);

  const assetsCard = (
    <div className="bg-card rounded-lg border border-border p-8">
      <h2 className="text-lg font-semibold text-foreground mb-6">Assets</h2>
      <AssetGallery
        clientId={clientId}
        assets={data.assets}
        variants={variants}
        onRefresh={onRefresh}
      />
    </div>
  );

  const restCards = (
    <>
      <div className="bg-card rounded-lg border border-border p-8 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">Frames</h2>
        <p className="text-sm text-muted-foreground mb-6 text-pretty">
          Frame images overlaid on the canvas. Choose one or more aspect ratios (or &quot;All&quot;) per frame so it appears when the canvas matches those formats.
        </p>
        <FrameGallery
          clientId={clientId}
          frames={data.frames}
          onRefresh={onRefresh}
        />
      </div>
      <div className="bg-card rounded-lg border border-border p-8 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Fonts</h2>
        <FontGallery
          clientId={clientId}
          fonts={data.fonts}
          onRefresh={onRefresh}
        />
      </div>
      <div className="bg-card rounded-lg border border-border p-8">
        <h2 className="text-lg font-semibold text-foreground mb-2">Canvas Sessions</h2>
        <p className="text-sm text-muted-foreground mb-6 text-pretty">
          Saved editor sessions for this client. Each session stores the canvas overlays and can be reopened in the editor.
        </p>
        <CanvasSessionGallery
          clientId={clientId}
          sessions={data.canvasSessions}
          onRefresh={onRefresh}
        />
      </div>
    </>
  );

  if (showOnly === "assets") return assetsCard;
  if (showOnly === "rest") return restCards;
  return (
    <>
      {assetsCard}
      {restCards}
    </>
  );
}

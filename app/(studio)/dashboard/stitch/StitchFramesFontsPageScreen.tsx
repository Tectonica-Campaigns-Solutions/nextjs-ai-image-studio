"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ClientAsset, ClientFont } from "../types";
import { StitchMaterialIcon } from "./StitchMaterialIcon";
import { deleteAssetAction, setPrimaryAssetAction } from "../actions/assets";
import { deleteFontAction, setPrimaryFontAction } from "../actions/fonts";
import { toast } from "sonner";
import {
  generateFontFaceCSS,
  getGoogleFontsUrl,
} from "../../standalone/studio/utils/studio-utils";
import { GalleryLightbox } from "../components/gallery-lightbox";

export type StitchFramesFontsPageScreenProps = Readonly<{
  frames: ClientAsset[];
  fonts: ClientFont[];
  clientNames: Record<string, string>;
  initialTab?: "frames" | "fonts";
}>;

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export function StitchFramesFontsPageScreen({
  frames: initialFrames,
  fonts: initialFonts,
  clientNames,
  initialTab = "frames",
}: StitchFramesFontsPageScreenProps) {
  const [tab, setTab] = useState<"frames" | "fonts">(initialTab);
  const [query, setQuery] = useState("");
  const [frames, setFrames] = useState<ClientAsset[]>(initialFrames);
  const [fonts, setFonts] = useState<ClientFont[]>(initialFonts);
  const [lightboxAsset, setLightboxAsset] = useState<ClientAsset | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Inject font-face for custom fonts (and load Google fonts stylesheet)
  // so the Fonts grid can preview both custom + google fonts visually.
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

  const filteredFrames = useMemo(() => {
    const q = query.trim().toLowerCase();
    return frames.filter((frame) => {
      if (!q) return true;
      return `${frame.display_name ?? frame.name} ${clientNames[frame.client_id] ?? ""} ${frame.variant ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [clientNames, frames, query]);

  const filteredFonts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fonts.filter((font) => {
      if (!q) return true;
      return `${font.font_family} ${font.font_category ?? ""} ${clientNames[font.client_id] ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [clientNames, fonts, query]);

  const handleSetPrimaryFrame = async (frame: ClientAsset) => {
    const result = await setPrimaryAssetAction(frame.client_id, frame.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setFrames((prev) =>
      prev.map((f) =>
        f.client_id === frame.client_id ? { ...f, is_primary: f.id === frame.id } : f
      )
    );
    toast.success("Primary frame updated");
  };

  const handleDeleteFrame = async (frame: ClientAsset) => {
    const result = await deleteAssetAction(frame.client_id, frame.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setFrames((prev) => prev.filter((f) => f.id !== frame.id));
    toast.success("Frame deleted");
  };

  const handleSetPrimaryFont = async (font: ClientFont) => {
    const result = await setPrimaryFontAction(font.client_id, font.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setFonts((prev) =>
      prev.map((f) =>
        f.client_id === font.client_id ? { ...f, is_primary: f.id === font.id } : f
      )
    );
    toast.success("Primary font updated");
  };

  const handleDeleteFont = async (font: ClientFont) => {
    const result = await deleteFontAction(font.client_id, font.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setFonts((prev) => prev.filter((f) => f.id !== font.id));
    toast.success("Font deleted");
  };

  return (
    <main className="ml-0 pt-24 px-10 pb-12 min-h-screen bg-surface">
      <GalleryLightbox
        asset={lightboxAsset}
        onClose={() => setLightboxAsset(null)}
        description="Full-size frame preview"
      />
      <div className="p-0">
        <div className="flex items-end justify-between mb-6">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-widest">
              <span>Dashboard</span>
              <StitchMaterialIcon icon="chevron_right" className="text-[10px]" />
              <span className="text-stitch-primary font-bold">
                {tab === "frames" ? "Frames" : "Fonts"}
              </span>
            </nav>
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface mb-2">
              Frames &amp; Fonts
            </h2>
            <p className="text-on-surface-variant max-w-2xl">
              Global operational view. Manage assets by client, or jump to client detail for upload/edit flows.
            </p>
          </div>
          <div />
        </div>

        <div className="flex gap-8 border-b border-outline-variant/10 mb-6 overflow-x-auto whitespace-nowrap">
          <button
            type="button"
            onClick={() => setTab("frames")}
            className={cx(
              "pb-4 text-sm relative",
              tab === "frames"
                ? "text-blue-700 font-bold border-b-2 border-blue-600"
                : "text-on-surface-variant font-medium hover:text-on-surface transition-colors"
            )}
          >
            Frames
          </button>
          <button
            type="button"
            onClick={() => setTab("fonts")}
            className={cx(
              "pb-4 text-sm relative",
              tab === "fonts"
                ? "text-blue-700 font-bold border-b-2 border-blue-600"
                : "text-on-surface-variant font-medium hover:text-on-surface transition-colors"
            )}
          >
            Fonts
          </button>
        </div>

        <div className="mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${tab}...`}
            className="h-10 w-full max-w-md rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 text-sm outline-none focus:border-stitch-primary"
          />
        </div>

        {tab === "frames" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFrames.map((frame) => (
              <div key={frame.id} className="group relative">
                <button
                  type="button"
                  onClick={() => setLightboxAsset(frame)}
                  className="relative aspect-square rounded-xl bg-surface-container-low overflow-hidden w-full cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={frame.file_url} alt={frame.display_name ?? frame.name} className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3">
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <Link
                        href={`/dashboard/clients/${frame.client_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-semibold px-2 py-1 rounded bg-white/90 text-slate-700 hover:bg-white"
                      >
                        Manage
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void handleSetPrimaryFrame(frame); }}
                        disabled={frame.is_primary}
                        className="text-[10px] font-semibold px-2 py-1 rounded bg-amber-100/95 text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {frame.is_primary ? "Primary" : "Set Primary"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void handleDeleteFrame(frame); }}
                        className="text-[10px] font-semibold px-2 py-1 rounded bg-red-500/90 text-white hover:bg-red-500"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white text-xs font-bold truncate">{frame.display_name ?? frame.name}</p>
                      <p className="text-white/75 text-[10px] truncate">{clientNames[frame.client_id] ?? "Client"}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        {frame.variant ? (
                          <span className="bg-white/90 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {frame.variant === "*" ? "All" : frame.variant}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFonts.map((font) => (
              <div key={font.id} className="group relative">
                <div className="relative aspect-square rounded-xl bg-surface-container-low overflow-hidden border border-outline-variant/10">
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <p
                      className="text-on-surface text-2xl font-extrabold leading-none break-words"
                      style={{ fontFamily: font.font_family }}
                    >
                      Lorem ipsum dolor sit amet
                    </p>
                    <p className="mt-4 text-xs font-semibold text-on-surface-variant/90 truncate w-full">
                      {font.font_family}
                    </p>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3">
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <Link
                        href={`/dashboard/clients/${font.client_id}`}
                        className="text-[10px] font-semibold px-2 py-1 rounded bg-white/90 text-slate-700 hover:bg-white"
                      >
                        Manage
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleSetPrimaryFont(font)}
                        disabled={font.is_primary}
                        className="text-[10px] font-semibold px-2 py-1 rounded bg-amber-100/95 text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {font.is_primary ? "Primary" : "Set Primary"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteFont(font)}
                        className="text-[10px] font-semibold px-2 py-1 rounded bg-red-500/90 text-white hover:bg-red-500"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white text-xs font-bold truncate">{font.font_family}</p>
                      <p className="text-white/75 text-[10px] truncate">{clientNames[font.client_id] ?? "Client"}</p>

                      <div className="mt-2 flex items-center gap-1.5">
                        {font.font_category ? (
                          <span className="bg-white/90 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {font.font_category}
                          </span>
                        ) : null}
                        <span className="bg-white/90 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {font.font_source}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}


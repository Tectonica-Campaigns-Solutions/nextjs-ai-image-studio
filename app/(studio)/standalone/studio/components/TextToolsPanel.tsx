"use client";

import React from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Bold, ChevronDown, Italic, Underline, Loader2, Baseline, Highlighter } from "lucide-react";
import { RgbaColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";
import type { EyedropperTarget } from "../hooks/use-eyedropper";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { rgbaToString } from "../utils/image-editor-utils";
import type { FontAsset, RgbaColor } from "../types/image-editor-types";
import type { GoogleFontCatalogEntry } from "../types/google-font-catalog";
import { normalizeFontCatalogKey } from "../utils/build-google-font-css2-url";
import { TextAlignCenterIcon, TextAlignLeftIcon, TextAlignRightIcon, TextToolIcon } from "./editor-icons";
import { StudioColorControl, StudioSliderRow, StudioSquareButton, studioForm } from "./studio-ui";

export interface TextToolsPanelProps {
  selectedObject: any;
  fontAssets: FontAsset[];
  /** Full Google catalog (Fontsource); "Other fonts" excludes brand names. */
  googleCatalogFonts: GoogleFontCatalogEntry[];
  googleCatalogLoading?: boolean;
  googleCatalogError?: boolean;
  fontsReady?: boolean;
  addText: () => void;
  fontSize: number;
  setFontSize: (n: number) => void;
  fontFamily: string;
  setFontFamily: (s: string) => void;
  isBold: boolean;
  setIsBold: (b: boolean) => void;
  isItalic: boolean;
  setIsItalic: (b: boolean) => void;
  isUnderline: boolean;
  setIsUnderline: (b: boolean) => void;
  lineHeight: number;
  setLineHeight: (n: number) => void;
  letterSpacing: number;
  setLetterSpacing: (n: number) => void;
  textAlign: "left" | "center" | "right";
  setTextAlign: (align: "left" | "center" | "right") => void;
  textColor: RgbaColor;
  setTextColor: (c: RgbaColor) => void;
  backgroundColor: RgbaColor;
  setBackgroundColor: (c: RgbaColor) => void;
  eyedropperTarget: EyedropperTarget;
  onStartEyedropper?: (target: EyedropperTarget) => void;
}

export const TextToolsPanel = React.memo(function TextToolsPanel({
  selectedObject,
  fontAssets,
  googleCatalogFonts,
  googleCatalogLoading = false,
  googleCatalogError = false,
  fontsReady = true,
  addText,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  isBold,
  setIsBold,
  isItalic,
  setIsItalic,
  isUnderline,
  setIsUnderline,
  lineHeight,
  setLineHeight,
  letterSpacing,
  setLetterSpacing,
  textAlign,
  setTextAlign,
  textColor,
  setTextColor,
  backgroundColor,
  setBackgroundColor,
  eyedropperTarget,
  onStartEyedropper,
}: TextToolsPanelProps) {
  const [fontPickerOpen, setFontPickerOpen] = React.useState(false);
  const isAddTextDisabled = fontAssets.length > 0 && !fontsReady;

  const { brandFonts, otherFontRows } = React.useMemo(() => {
    const brandFonts = fontAssets.filter((f) => f.is_brand);
    const brandKeys = new Set(
      brandFonts.map((f) => normalizeFontCatalogKey(f.font_family)),
    );

    const otherByKey = new Map<
      string,
      | { kind: "google"; entry: GoogleFontCatalogEntry }
      | { kind: "custom"; asset: FontAsset }
    >();

    for (const entry of googleCatalogFonts) {
      const key = normalizeFontCatalogKey(entry.family);
      if (brandKeys.has(key)) continue;
      otherByKey.set(key, { kind: "google", entry });
    }

    for (const asset of fontAssets) {
      if (asset.is_brand) continue;
      if (asset.font_source !== "custom") continue;
      const key = normalizeFontCatalogKey(asset.font_family);
      if (brandKeys.has(key)) continue;
      otherByKey.set(key, { kind: "custom", asset });
    }

    const otherFontRows = [...otherByKey.values()].sort((a, b) => {
      const nameA = a.kind === "google" ? a.entry.family : a.asset.font_family;
      const nameB = b.kind === "google" ? b.entry.family : b.asset.font_family;
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    });

    return { brandFonts, otherFontRows };
  }, [fontAssets, googleCatalogFonts]);

  return (
    <div className={studioForm.section}>
      <button
        type="button"
        onClick={addText}
        disabled={isAddTextDisabled}
        className={studioForm.primaryButton}
      >
        {isAddTextDisabled ? (
          <>
            <Loader2 className="size-[19px] animate-spin shrink-0" aria-hidden />
            Loading fonts...
          </>
        ) : (
          <>
            <TextToolIcon />
            Add a text box
          </>
        )}
      </button>

      <div className={studioForm.divider} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[130px] flex-1">
          <Popover open={fontPickerOpen} onOpenChange={setFontPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={!selectedObject}
                aria-expanded={fontPickerOpen}
                aria-haspopup="listbox"
                className={cn(
                  studioForm.selectTrigger,
                  "flex w-full items-center justify-between gap-2 text-left",
                  !selectedObject && "opacity-50 pointer-events-none",
                )}
              >
                <span className="truncate">{fontFamily}</span>
                {googleCatalogLoading ? (
                  <Loader2 className="size-4 shrink-0 animate-spin opacity-80" aria-hidden />
                ) : (
                  <ChevronDown
                    className={cn("size-4 shrink-0 opacity-80 transition-transform", fontPickerOpen && "rotate-180")}
                    aria-hidden
                  />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-[10px] border border-white/[0.17] bg-[#211E30] p-0 text-[#F5F4FB] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.7)]"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Command
                className="bg-[#211E30] text-[#F5F4FB] [&_[cmdk-input-wrapper]]:border-white/[0.09] [&_[cmdk-input-wrapper]]:border-b"
                shouldFilter
                filter={(value, search) => {
                  if (!search.trim()) return 1;
                  return value.toLowerCase().includes(search.toLowerCase().trim()) ? 1 : 0;
                }}
              >
                <CommandInput
                  placeholder="Search fonts…"
                  className="h-10 border-0 bg-transparent text-[13.5px] text-[#F5F4FB] placeholder:text-[#726F86]"
                />
                <CommandList className="max-h-[min(60vh,320px)]">
                  {googleCatalogError && (
                    <p className="px-3 py-2 text-[12px] text-[#ADAAC0]">
                      Could not load the full font list. Brand and custom fonts are still available.
                    </p>
                  )}
                  <CommandEmpty className="py-6 text-[13px] text-[#ADAAC0]">No fonts match.</CommandEmpty>
                  {brandFonts.length > 0 && (
                    <CommandGroup
                      heading="Brand fonts"
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#726F86]"
                    >
                      {brandFonts.map((font) => (
                        <CommandItem
                          key={`brand-${font.font_family}`}
                          value={font.font_family}
                          onSelect={() => {
                            setFontFamily(font.font_family);
                            setFontPickerOpen(false);
                          }}
                          style={{ fontFamily: font.font_family }}
                          className="text-[13.5px] text-[#F5F4FB] aria-selected:bg-[rgba(128,105,255,0.16)] data-[selected=true]:bg-[rgba(128,105,255,0.16)]"
                        >
                          {font.font_family}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {otherFontRows.length > 0 && (
                    <CommandGroup
                      heading="Other fonts"
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#726F86]"
                    >
                      {otherFontRows.map((row) => {
                        if (row.kind === "custom") {
                          const { asset } = row;
                          return (
                            <CommandItem
                              key={`other-custom-${asset.font_family}`}
                              value={asset.font_family}
                              onSelect={() => {
                                setFontFamily(asset.font_family);
                                setFontPickerOpen(false);
                              }}
                              style={{ fontFamily: asset.font_family }}
                              className="text-[13.5px] text-[#F5F4FB] aria-selected:bg-[rgba(128,105,255,0.16)] data-[selected=true]:bg-[rgba(128,105,255,0.16)]"
                            >
                              {asset.font_family}
                            </CommandItem>
                          );
                        }
                        const name = row.entry.family;
                        return (
                          <CommandItem
                            key={`other-google-${name}`}
                            value={name}
                            onSelect={() => {
                              setFontFamily(name);
                              setFontPickerOpen(false);
                            }}
                            style={{ fontFamily: name }}
                            className="text-[13.5px] text-[#F5F4FB] aria-selected:bg-[rgba(128,105,255,0.16)] data-[selected=true]:bg-[rgba(128,105,255,0.16)]"
                          >
                            {name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <StudioSquareButton label="Bold" active={isBold} disabled={!selectedObject} onClick={() => setIsBold(!isBold)}>
            <Bold className="size-[18px]" />
          </StudioSquareButton>
          <StudioSquareButton label="Italic" active={isItalic} disabled={!selectedObject} onClick={() => setIsItalic(!isItalic)}>
            <Italic className="size-[18px]" />
          </StudioSquareButton>
          <StudioSquareButton label="Underline" active={isUnderline} disabled={!selectedObject} onClick={() => setIsUnderline(!isUnderline)}>
            <Underline className="size-[18px]" />
          </StudioSquareButton>
        </div>
      </div>

      <div className={studioForm.divider} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          <StudioSquareButton label="Align left" active={textAlign === "left"} disabled={!selectedObject} onClick={() => setTextAlign("left")}>
            <TextAlignLeftIcon />
          </StudioSquareButton>
          <StudioSquareButton label="Align center" active={textAlign === "center"} disabled={!selectedObject} onClick={() => setTextAlign("center")}>
            <TextAlignCenterIcon />
          </StudioSquareButton>
          <StudioSquareButton label="Align right" active={textAlign === "right"} disabled={!selectedObject} onClick={() => setTextAlign("right")}>
            <TextAlignRightIcon />
          </StudioSquareButton>
        </div>
        <div className="flex-1" />
        <div className={studioForm.colorControlGroup}>
          <StudioColorControl
            label="Text color"
            color={rgbaToString(textColor)}
            disabled={!selectedObject}
            icon={<Baseline className="size-[18px]" strokeWidth={2} />}
            eyedropperActive={eyedropperTarget === "textColor"}
            onStartEyedropper={
              onStartEyedropper ? () => onStartEyedropper("textColor") : undefined
            }
          >
            <RgbaColorPicker color={textColor} onChange={setTextColor} />
          </StudioColorControl>
          <StudioColorControl
            label="Highlight color"
            color={rgbaToString(backgroundColor)}
            disabled={!selectedObject}
            icon={<Highlighter className="size-[18px]" strokeWidth={2} />}
            eyedropperActive={eyedropperTarget === "backgroundColor"}
            onStartEyedropper={
              onStartEyedropper ? () => onStartEyedropper("backgroundColor") : undefined
            }
          >
            <RgbaColorPicker color={backgroundColor} onChange={setBackgroundColor} />
          </StudioColorControl>
        </div>
      </div>

      <div className={studioForm.divider} />

      <StudioSliderRow
        label="Size"
        labelClassName={studioForm.labelNarrow}
        value={fontSize}
        displayValue={`${fontSize}px`}
        min={12}
        max={72}
        step={1}
        onChange={setFontSize}
        disabled={!selectedObject}
      />
      <StudioSliderRow
        label="Line"
        labelClassName={studioForm.labelNarrow}
        value={lineHeight}
        displayValue={lineHeight.toFixed(1)}
        min={0.8}
        max={3.0}
        step={0.1}
        onChange={setLineHeight}
        disabled={!selectedObject}
      />
    </div>
  );
});

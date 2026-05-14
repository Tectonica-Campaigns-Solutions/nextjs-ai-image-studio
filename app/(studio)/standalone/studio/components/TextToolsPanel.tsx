"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Bold, ChevronDown, Italic, Underline, Loader2, Pipette } from "lucide-react";
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
    <div className="space-y-5 w-full">
      <Button
        onClick={addText}
        disabled={isAddTextDisabled}
        className="w-full h-[44px] bg-[#5C38F3] text-white shadow-md cursor-pointer text-[15px] leading-[160%] font-semibold font-(family-name:--font-manrope) rounded-[10px] transition-all hover:bg-[#4A2DD1] hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-[#5C38F3]"
      >
        {isAddTextDisabled ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
            Loading fonts...
          </>
        ) : (
          <>
            <TextToolIcon />
            Add a text box
          </>
        )}
      </Button>
      <div className="w-full  h-[1px] bg-[#2D2D2D]"></div>
      <div className="grid grid-cols-2 gap-[20px]">
        <div className="w-full">
          <Popover open={fontPickerOpen} onOpenChange={setFontPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedObject}
                aria-expanded={fontPickerOpen}
                aria-haspopup="listbox"
                className={cn(
                  "w-full justify-between bg-[#0D0D0D] py-[10px] px-[16px] border-[#2D2D2D] text-[13px] font-medium leading-[135%] text-white font-(family-name:--font-manrope) h-[44px]! rounded-[10px] transition-all",
                  "hover:border-[#444] hover:bg-[#161616] hover:!text-white dark:hover:bg-[#161616] dark:hover:!text-white",
                  "focus-visible:!text-white focus-visible:ring-2 focus-visible:ring-[#5C38F3]/30 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent",
                  "[&_svg]:shrink-0 [&_svg]:text-white/80 [&_svg]:opacity-90 hover:[&_svg]:text-white/90",
                  !selectedObject && "opacity-50 pointer-events-none",
                )}
              >
                <span className="truncate text-left text-inherit">{fontFamily}</span>
                {googleCatalogLoading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-inherit opacity-80" aria-hidden />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-inherit opacity-80" aria-hidden />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[min(100vw-1.5rem,22rem)] p-0 bg-[#0D0D0D] border border-[#2D2D2D] text-[#F4F4F4] shadow-md rounded-[10px] overflow-hidden"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Command
                className={cn(
                  "studio-font-picker-command bg-[#0D0D0D] text-[#F4F4F4]",
                  "[&_[cmdk-input-wrapper]]:border-[#2D2D2D] [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:ring-0 [&_[cmdk-input-wrapper]]:shadow-none",
                  "[&_[data-slot=command-input]]:border-0 [&_[data-slot=command-input]]:shadow-none",
                  "[&_[data-slot=command-input]]:outline-none [&_[data-slot=command-input]]:ring-0",
                  "[&_[data-slot=command-input]]:focus:outline-none [&_[data-slot=command-input]]:focus-visible:outline-none",
                  "[&_[data-slot=command-input]]:focus:ring-0 [&_[data-slot=command-input]]:focus-visible:ring-0",
                  "[&_[data-slot=command-input]]:focus-visible:ring-offset-0",
                )}
                shouldFilter
                filter={(value, search) => {
                  if (!search.trim()) return 1;
                  return value.toLowerCase().includes(search.toLowerCase().trim())
                    ? 1
                    : 0;
                }}
              >
                <CommandInput
                  placeholder="Search fonts…"
                  className="h-10 border-0 border-b border-[#2D2D2D] bg-transparent text-[13px] text-white placeholder:text-[#929292] shadow-none outline-none ring-0 ring-offset-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0"
                />
                <CommandList className="max-h-[min(60vh,320px)]">
                  {googleCatalogError && (
                    <p className="px-3 py-2 text-[12px] text-[#929292] font-(family-name:--font-manrope)">
                      Could not load the full font list. Brand and custom fonts are still available.
                    </p>
                  )}
                  <CommandEmpty className="py-6 text-[13px] text-[#929292]">
                    No fonts match.
                  </CommandEmpty>
                  {brandFonts.length > 0 && (
                    <CommandGroup
                      heading="Brand fonts"
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#929292] [&_[cmdk-group-heading]]:font-(family-name:--font-manrope)"
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
                          className="text-[13px] leading-[135%] text-[#F4F4F4] aria-selected:bg-[#1F1F1F] data-[selected=true]:bg-[#1F1F1F]"
                        >
                          {font.font_family}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {otherFontRows.length > 0 && (
                    <CommandGroup
                      heading="Other fonts"
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#929292] [&_[cmdk-group-heading]]:font-(family-name:--font-manrope)"
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
                              className="text-[13px] leading-[135%] text-[#F4F4F4] aria-selected:bg-[#1F1F1F] data-[selected=true]:bg-[#1F1F1F]"
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
                            className="text-[13px] leading-[135%] text-[#F4F4F4] aria-selected:bg-[#1F1F1F] data-[selected=true]:bg-[#1F1F1F]"
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
        <div>
          <div className="grid grid-cols-3 gap-[5px] h-full">
            <Button
              variant={isBold ? "default" : "outline"}
              size="sm"
              onClick={() => setIsBold(!isBold)}
              disabled={!selectedObject}
              aria-label={isBold ? "Remove bold" : "Bold"}
              className={cn(
                "h-full cursor-pointer bg-[#191919] rounded-[10px] border border-[#2D2D2D] transition-all hover:bg-[#252525] hover:border-[#444] active:scale-95",
                isBold && "bg-[#0D0D0D] border-[#5C38F3] shadow-sm"
              )}
            >
              <Bold className="w-4 h-4 text-white" />
            </Button>
            <Button
              variant={isItalic ? "default" : "outline"}
              size="sm"
              onClick={() => setIsItalic(!isItalic)}
              disabled={!selectedObject}
              aria-label={isItalic ? "Remove italic" : "Italic"}
              className={cn(
                "h-full cursor-pointer bg-[#191919] rounded-[10px] border border-[#2D2D2D] transition-all hover:bg-[#252525] hover:border-[#444] active:scale-95",
                isItalic && "bg-[#0D0D0D] border-[#5C38F3] shadow-sm"
              )}
            >
              <Italic className="w-4 h-4 text-white" />
            </Button>
            <Button
              variant={isUnderline ? "default" : "outline"}
              size="sm"
              onClick={() => setIsUnderline(!isUnderline)}
              disabled={!selectedObject}
              aria-label={isUnderline ? "Remove underline" : "Underline"}
              className={cn(
                "h-full cursor-pointer bg-[#191919] rounded-[10px] border border-[#2D2D2D] transition-all hover:bg-[#252525] hover:border-[#444] active:scale-95",
                isUnderline && "bg-[#0D0D0D] border-[#5C38F3] shadow-sm"
              )}
            >
              <Underline className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>
      </div>
      <div className="w-full h-[1px] bg-[#2D2D2D]" />
      <div className="grid grid-cols-2 gap-4 items-center">
        {/* Alignment */}
        <div className="min-w-0 flex shrink-0">
          <div className="grid grid-cols-3 gap-[5px] w-fit">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTextAlign("left")}
              disabled={!selectedObject}
              aria-label="Align text left"
              className={cn(
                "!py-[10px] !px-[16px] cursor-pointer bg-[#191919] rounded-[10px] border border-[#2D2D2D] transition-all hover:bg-[#252525] hover:border-[#444] active:scale-95 h-auto",
                textAlign === "left" && "bg-[#0D0D0D] border-[#5C38F3] shadow-sm"
              )}
            >
              <TextAlignLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTextAlign("center")}
              disabled={!selectedObject}
              aria-label="Align text center"
              className={cn(
                "!py-[10px] !px-[16px] cursor-pointer bg-[#191919] rounded-[10px] border border-[#2D2D2D] transition-all hover:bg-[#252525] hover:border-[#444] active:scale-95 h-auto",
                textAlign === "center" && "bg-[#0D0D0D] border-[#5C38F3] shadow-sm"
              )}
            >
              <TextAlignCenterIcon />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTextAlign("right")}
              disabled={!selectedObject}
              aria-label="Align text right"
              className={cn(
                "!py-[10px] !px-[16px] cursor-pointer bg-[#191919] rounded-[10px] border border-[#2D2D2D] transition-all hover:bg-[#252525] hover:border-[#444] active:scale-95 h-auto",
                textAlign === "right" && "bg-[#0D0D0D] border-[#5C38F3] shadow-sm"
              )}
            >
              <TextAlignRightIcon />
            </Button>
          </div>
        </div>
        {/* Colors */}
        <div className="flex gap-4 justify-end items-center min-w-0">
          {/* Text Color */}
          <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={!selectedObject}
                  aria-label="Change text color"
                  className={cn(
                    "flex items-center gap-2 px-0 cursor-pointer bg-transparent border-none shrink-0 group",
                    !selectedObject && "opacity-50 pointer-events-none",
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-full border-2 border-[#C5CAD9] shadow-sm transition-transform group-hover:scale-105 shrink-0"
                    style={{ backgroundColor: rgbaToString(textColor) }}
                  />
                  <div className="flex flex-col gap-[2px] items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M2 17.0588H4.82353M11.4118 17.0588H18M4.72941 12.3529H11.2235M7.83529 4.16471L13.2941 17.0588M2.94118 17.0588L8.58823 2H10.4706L17.0588 17.0588" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="h-[2px] w-[20px] bg-[#E5E5EF]" />
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4 bg-[#0D0D0D] border border-[#2D2D2D] rounded-[10px]">
                <RgbaColorPicker color={textColor} onChange={setTextColor} />
                {onStartEyedropper && (
                  <button
                    type="button"
                    onClick={() => onStartEyedropper("textColor")}
                    className={cn(
                      "mt-2 flex w-full items-center justify-center gap-1.5 rounded-[8px] border border-[#2D2D2D] bg-[#141414] py-1.5 cursor-pointer transition-all text-[12px] font-medium text-[#929292] font-(family-name:--font-manrope)",
                      "hover:border-[#444] hover:bg-[#1A1A1A] hover:text-white",
                      eyedropperTarget === "textColor" && "border-[#5C38F3] bg-[#5C38F3]/10 text-white"
                    )}
                  >
                    <Pipette className="w-3.5 h-3.5" />
                    Pick from canvas
                  </button>
                )}
              </PopoverContent>
          </Popover>
          {/* Background Color */}
          <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={!selectedObject}
                  aria-label="Change text background color"
                  className={cn(
                    "flex items-center gap-2 px-0 cursor-pointer bg-transparent border-none shrink-0 group",
                    !selectedObject && "opacity-50 pointer-events-none",
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-full border-2 border-[#C5CAD9] shadow-sm transition-transform group-hover:scale-105 shrink-0"
                    style={{ backgroundColor: rgbaToString(backgroundColor) }}
                  />
                  <div className="rounded-[3px] bg-white p-[4px] h-[28px] w-[28px] flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M2 17.0588H4.82353M11.4118 17.0588H18M4.72941 12.3529H11.2235M7.83529 4.16471L13.2941 17.0588M2.94118 17.0588L8.58823 2H10.4706L17.0588 17.0588" stroke="#191919" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4 bg-[#0D0D0D] border border-[#2D2D2D] rounded-[10px]">
                <RgbaColorPicker color={backgroundColor} onChange={setBackgroundColor} />
                {onStartEyedropper && (
                  <button
                    type="button"
                    onClick={() => onStartEyedropper("backgroundColor")}
                    className={cn(
                      "mt-2 flex w-full items-center justify-center gap-1.5 rounded-[8px] border border-[#2D2D2D] bg-[#141414] py-1.5 cursor-pointer transition-all text-[12px] font-medium text-[#929292] font-(family-name:--font-manrope)",
                      "hover:border-[#444] hover:bg-[#1A1A1A] hover:text-white",
                      eyedropperTarget === "backgroundColor" && "border-[#5C38F3] bg-[#5C38F3]/10 text-white"
                    )}
                  >
                    <Pipette className="w-3.5 h-3.5" />
                    Pick from canvas
                  </button>
                )}
              </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="w-full h-[1px] bg-[#2D2D2D]" />
      <div className="grid grid-cols-2 gap-4">
        <div className="grid grid-cols-[auto_1fr_40px] gap-[11px] items-center min-w-0">
          <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block shrink-0">
            Size
          </Label>
          <div className="min-w-0">
            <Slider
              value={[fontSize]}
              onValueChange={([value]) => setFontSize(value)}
              min={12}
              max={72}
              step={1}
              disabled={!selectedObject}
              className={cn(
                "w-full",
                "[&_[data-slot=slider-track]]:bg-[#303030c4]",
                "[&_[data-slot=slider-range]]:bg-[#5C38F3_!important]",
                "[&_[role=slider]]:bg-[#FFF] [&_[role=slider]]:border-[1px] [&_[role=slider]]:border-[#9094A4]"
              )}
            />
          </div>
          <div className="p-[5px] rounded-[5px] border border-[#303030] font-(family-name:--font-manrope) text-[12px] font-medium leading-[135%] text-[#929292] text-center transition-colors hover:border-[#444] shrink-0 tabular-nums">
            {fontSize}px
          </div>
        </div>
        <div className="grid grid-cols-[auto_1fr_40px] gap-[11px] items-center min-w-0">
          <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block shrink-0">
            Line
          </Label>
          <div className="min-w-0">
            <Slider
              value={[lineHeight]}
              onValueChange={([value]) => setLineHeight(value)}
              min={0.8}
              max={3.0}
              step={0.1}
              disabled={!selectedObject}
              className={cn(
                "w-full",
                "[&_[data-slot=slider-track]]:bg-[#303030c4]",
                "[&_[data-slot=slider-range]]:bg-[#5C38F3_!important]",
                "[&_[role=slider]]:bg-[#FFF] [&_[role=slider]]:border-[1px] [&_[role=slider]]:border-[#9094A4]"
              )}
            />
          </div>
          <div className="p-[5px] rounded-[5px] border border-[#303030] font-(family-name:--font-manrope) text-[12px] font-medium leading-[135%] text-[#929292] text-center transition-colors hover:border-[#444] shrink-0 tabular-nums">
            <span>{lineHeight.toFixed(1)}</span>
          </div>
        </div>
      </div>
      <div className="w-full h-[1px] bg-[#2D2D2D]" />
    </div>
  );
});

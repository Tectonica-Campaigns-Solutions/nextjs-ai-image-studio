"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Droplet,
  Highlighter,
  Italic,
  Link,
  Loader2,
  Image,
  Maximize2,
  Shapes,
  Type,
  Underline,
  Upload,
} from "lucide-react";
import { Check } from "lucide-react";
import NextImage from "next/image";
import { cn } from "@/lib/utils";
import { UI_COLORS, TEXT_RANGES, SHAPE_RANGES } from "../constants/editor-constants";
import type { FontAsset, FrameAsset, LogoAsset, RgbaColor, ShapeType } from "../types/image-editor-types";
import type { GoogleFontCatalogEntry } from "../types/google-font-catalog";
import { rgbaToString } from "../utils/image-editor-utils";
import { normalizeFontCatalogKey } from "../utils/build-google-font-css2-url";
import {
  StudioOrDivider,
  StudioSliderRow,
  StudioSquareButton,
  studioForm,
} from "./studio-ui";
import { ShapeMobilePicker } from "./ShapeToolsPanel";
import { FrameItem } from "./editor-icons";

export type MobileFloatTarget = "text" | "logo" | "qr" | "shape" | "frame";

function hexToRgba(hex: string, a = 1): RgbaColor {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
    a,
  };
}

function rgbaToHex(color: RgbaColor): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

const TEXT_SWATCHES = [
  "#FFFFFF",
  "#141220",
  "#8069FF",
  "#FF9A54",
  "#54B978",
  "#F26B81",
  "#14A9DC",
  "#FFD84D",
];

const SHAPE_SWATCHES = [
  "#8069FF",
  "#FFFFFF",
  "#141220",
  "#FF9A54",
  "#54B978",
  "#F26B81",
];

/** Text/logo tabs use fixed bottom controls on mobile — no bottom sheet. */
export const MOBILE_FLOAT_TOOL_TABS = ["text-tools", "logo-overlay"] as const;

export type MobileFloatToolTab = (typeof MOBILE_FLOAT_TOOL_TABS)[number];

export function isMobileFloatToolTab(tab: string | null): tab is MobileFloatToolTab {
  return tab === "text-tools" || tab === "logo-overlay";
}

/** Detect editable object type from canvas selection (independent of active tool tab). */
export function getMobileFloatTargetFromObject(obj: unknown): MobileFloatTarget | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (o.isBackground) return null;
  if (o.type === "textbox") return "text";
  if (o.isLogo) return "logo";
  if (o.isQR) return "qr";
  if (o.isShape) return "shape";
  if (o.isFrame) return "frame";
  return null;
}

function buildMobileFontFamilies(
  fontAssets: FontAsset[],
  googleCatalogFonts: GoogleFontCatalogEntry[],
): string[] {
  const brandFonts = fontAssets.filter((f) => f.is_brand).map((f) => f.font_family);
  const brandKeys = new Set(brandFonts.map((f) => normalizeFontCatalogKey(f)));
  const otherFamilies = new Set<string>();

  for (const entry of googleCatalogFonts) {
    const key = normalizeFontCatalogKey(entry.family);
    if (!brandKeys.has(key)) otherFamilies.add(entry.family);
  }

  for (const asset of fontAssets) {
    if (asset.is_brand || asset.font_source !== "custom") continue;
    const key = normalizeFontCatalogKey(asset.font_family);
    if (!brandKeys.has(key)) otherFamilies.add(asset.font_family);
  }

  if (brandFonts.length === 0 && otherFamilies.size === 0) {
    return ["Manrope"];
  }

  return [
    ...brandFonts,
    ...[...otherFamilies].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
  ];
}

function FloatPanel({
  compact,
  className,
  children,
}: {
  compact?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "vs-pop border border-white/[0.17] bg-[rgba(33,30,48,0.94)] shadow-[0_16px_36px_-18px_rgba(0,0,0,0.85)] backdrop-blur-md",
        compact ? "rounded-[14px] p-[9px]" : "rounded-2xl p-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

function PillBtn({
  label,
  active,
  onClick,
  children,
  size = 44,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  size?: number;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border box-border transition-colors",
        active
          ? "border-[#8069FF] bg-[rgba(128,105,255,0.16)] text-[#8069FF]"
          : "border-transparent bg-transparent text-[#F5F4FB]",
      )}
    >
      {children}
    </button>
  );
}

function HueBar({ onPick }: { onPick: (hex: string) => void }) {
  const pick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const h = Math.round(Math.max(0, Math.min(1, x / rect.width)) * 360);
    onPick(`hsl(${h} 85% 58%)`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={pick}
      onTouchStart={pick}
      title="Custom colour"
      className="h-[18px] shrink-0 cursor-pointer rounded-full border border-white/[0.17]"
      style={{
        background:
          "linear-gradient(90deg,#FF5B5B,#FFD84D,#54B978,#14A9DC,#8069FF,#F26B81,#FF5B5B)",
      }}
    />
  );
}

function FloatPill({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.17] bg-[rgba(20,18,32,0.86)] p-[5px] shadow-[0_16px_36px_-18px_rgba(0,0,0,0.8)] backdrop-blur-md">
      {children}
    </div>
  );
}

function PillDivider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-white/[0.17]" />;
}

function MobileFloatSliderRow({
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className="flex w-[min(260px,calc(100vw-2.5rem))] items-center gap-2.5">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mobile-float-range min-w-0 flex-1"
        style={{
          background: `linear-gradient(to right, #8069FF 0%, #8069FF ${pct}%, #211E30 ${pct}%, #211E30 100%)`,
        }}
      />
      <span className={studioForm.valueBox}>{displayValue}</span>
    </div>
  );
}

function hslToRgba(hsl: string): RgbaColor | null {
  const el = document.createElement("div");
  el.style.color = hsl;
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).color;
  document.body.removeChild(el);
  const m = rgb.match(/\d+/g);
  if (!m) return null;
  return { r: +m[0], g: +m[1], b: +m[2], a: 1 };
}

function ColorPickerPanel({
  color,
  onChange,
  allowClear,
  onClear,
}: {
  color: RgbaColor;
  onChange: (c: RgbaColor) => void;
  allowClear?: boolean;
  onClear?: () => void;
}) {
  const colorHex = color.a === 0 ? null : rgbaToHex(color);

  return (
    <FloatPanel compact>
      {allowClear && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="mb-2.5 flex h-9 w-full cursor-pointer items-center justify-center rounded-[10px] border border-white/[0.09] text-[13px] font-bold text-[#ADAAC0] hover:bg-white/[0.04]"
        >
          No highlight
        </button>
      ) : null}
      <div className="mb-2.5 flex items-center justify-between gap-1.5">
        {TEXT_SWATCHES.slice(0, 6).map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onChange(hexToRgba(c))}
            className={cn(
              "size-8 shrink-0 cursor-pointer rounded-full border-2 box-border",
              c === colorHex ? "border-[#8069FF]" : "border-white/[0.17]",
            )}
            style={{ background: c }}
          />
        ))}
      </div>
      <HueBar
        onPick={(hsl) => {
          const picked = hslToRgba(hsl);
          if (picked) onChange(picked);
        }}
      />
    </FloatPanel>
  );
}

function TextFloatControls({
  fontAssets,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  isBold,
  setIsBold,
  isItalic,
  setIsItalic,
  isUnderline,
  setIsUnderline,
  textAlign,
  setTextAlign,
  textColor,
  setTextColor,
  backgroundColor,
  setBackgroundColor,
  lineHeight,
  setLineHeight,
  googleCatalogFonts,
  googleCatalogLoading,
}: {
  fontAssets: FontAsset[];
  fontFamily: string;
  setFontFamily: (v: string) => void;
  fontSize: number;
  setFontSize: (v: number) => void;
  isBold: boolean;
  setIsBold: (v: boolean) => void;
  isItalic: boolean;
  setIsItalic: (v: boolean) => void;
  isUnderline: boolean;
  setIsUnderline: (v: boolean) => void;
  textAlign: "left" | "center" | "right";
  setTextAlign: (v: "left" | "center" | "right") => void;
  textColor: RgbaColor;
  setTextColor: (c: RgbaColor) => void;
  backgroundColor: RgbaColor;
  setBackgroundColor: (c: RgbaColor) => void;
  lineHeight: number;
  setLineHeight: (n: number) => void;
  googleCatalogFonts: GoogleFontCatalogEntry[];
  googleCatalogLoading?: boolean;
}) {
  const [expand, setExpand] = useState<"color" | "background" | "type" | null>(null);
  const AlignIcon =
    textAlign === "left" ? AlignLeft : textAlign === "right" ? AlignRight : AlignCenter;
  const cycleAlign = () => {
    const order: Array<"left" | "center" | "right"> = ["left", "center", "right"];
    const i = order.indexOf(textAlign);
    setTextAlign(order[(i + 1) % order.length]);
  };

  const fonts = useMemo(
    () => buildMobileFontFamilies(fontAssets, googleCatalogFonts),
    [fontAssets, googleCatalogFonts],
  );

  return (
    <div className="relative flex flex-col items-center gap-2">
      {expand === "color" ? (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2">
          <ColorPickerPanel color={textColor} onChange={setTextColor} />
        </div>
      ) : null}

      {expand === "background" ? (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2">
          <ColorPickerPanel
            color={backgroundColor}
            onChange={setBackgroundColor}
            allowClear
            onClear={() => setBackgroundColor({ r: 255, g: 255, b: 255, a: 0 })}
          />
        </div>
      ) : null}

      {expand === "type" ? (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 w-[min(300px,calc(100vw-2rem))] -translate-x-1/2">
          <FloatPanel>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  disabled={googleCatalogLoading}
                  className={cn(
                    studioForm.selectTrigger,
                    "h-12 w-full truncate pr-9",
                    googleCatalogLoading && "opacity-60",
                  )}
                >
                  {fonts.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                {googleCatalogLoading ? (
                  <Loader2
                    className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-[#ADAAC0]"
                    aria-hidden
                  />
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <StudioSquareButton label="Bold" active={isBold} onClick={() => setIsBold(!isBold)}>
                  <Bold className="size-[19px]" strokeWidth={2} />
                </StudioSquareButton>
                <StudioSquareButton label="Italic" active={isItalic} onClick={() => setIsItalic(!isItalic)}>
                  <Italic className="size-[19px]" strokeWidth={2} />
                </StudioSquareButton>
                <StudioSquareButton label="Underline" active={isUnderline} onClick={() => setIsUnderline(!isUnderline)}>
                  <Underline className="size-[19px]" strokeWidth={2} />
                </StudioSquareButton>
              </div>
            </div>
            <div className="mt-3">
              <StudioSliderRow
                label="Size"
                value={fontSize}
                displayValue={`${fontSize}px`}
                min={12}
                max={96}
                step={1}
                onChange={setFontSize}
              />
            </div>
            <div className="mt-3">
              <StudioSliderRow
                label="Line"
                labelClassName="text-[13.5px] font-bold text-[#F5F4FB] w-[34px] shrink-0"
                value={lineHeight}
                displayValue={lineHeight.toFixed(1)}
                min={TEXT_RANGES.LINE_HEIGHT_MIN}
                max={TEXT_RANGES.LINE_HEIGHT_MAX}
                step={TEXT_RANGES.LINE_HEIGHT_STEP}
                onChange={setLineHeight}
              />
            </div>
          </FloatPanel>
        </div>
      ) : null}

      <FloatPill>
        <button
          type="button"
          title="Text colour"
          aria-label="Text colour"
          onClick={() => setExpand(expand === "color" ? null : "color")}
          className={cn(
            "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 box-border",
            expand === "color" ? "border-[#8069FF]" : "border-white/[0.17]",
          )}
        >
          <span
            className="inline-flex size-7 items-center justify-center rounded-full p-0.5"
            style={{
              background:
                "conic-gradient(#FF5B5B,#FFD84D,#54B978,#14A9DC,#8069FF,#F26B81,#FF5B5B)",
            }}
          >
            <span
              className="size-full rounded-full border border-black/25"
              style={{ background: rgbaToString(textColor) }}
            />
          </span>
        </button>
        <button
          type="button"
          title="Highlight colour"
          aria-label="Highlight colour"
          onClick={() => setExpand(expand === "background" ? null : "background")}
          className={cn(
            "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 box-border",
            expand === "background" ? "border-[#8069FF]" : "border-white/[0.17]",
          )}
        >
          <span
            className="relative inline-flex size-7 items-center justify-center overflow-hidden rounded-md border border-white/[0.17]"
            style={
              backgroundColor.a === 0
                ? {
                  backgroundImage:
                    "linear-gradient(45deg,#726F86 25%,transparent 25%,transparent 75%,#726F86 75%),linear-gradient(45deg,#726F86 25%,transparent 25%,transparent 75%,#726F86 75%)",
                  backgroundSize: "6px 6px",
                  backgroundPosition: "0 0, 3px 3px",
                }
                : { background: rgbaToString(backgroundColor) }
            }
          >
            <Highlighter className="size-4 text-[#F5F4FB]" strokeWidth={2} />
          </span>
        </button>
        <PillBtn
          label="Typography & size"
          active={expand === "type"}
          onClick={() => setExpand(expand === "type" ? null : "type")}
        >
          <span className="text-[17px] font-extrabold tracking-[-0.02em]">Aa</span>
        </PillBtn>
        <PillBtn label={`Align ${textAlign}`} active={textAlign !== "center"} onClick={cycleAlign}>
          <AlignIcon className="size-5" strokeWidth={2} />
        </PillBtn>
      </FloatPill>
    </div>
  );
}

function LogoSelectPanel({
  logoAssets,
  onSelect,
  selectedUrl,
  allowCustomLogo,
  onUpload,
  uploadInputId,
}: {
  logoAssets: LogoAsset[];
  onSelect: (url: string) => void;
  selectedUrl?: string | null;
  allowCustomLogo?: boolean;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadInputId?: string;
}) {
  const fileInputId = uploadInputId ?? "logoMobileUploadInput";

  return (
    <FloatPanel compact className="w-[min(300px,calc(100vw-2rem))]">
      <div className="vs-noscroll flex max-h-[240px] flex-col gap-2 overflow-y-auto">
        {logoAssets.map((asset) => {
          const selected = selectedUrl === asset.url;
          return (
            <button
              key={`${asset.url}-${asset.display_name}`}
              type="button"
              onClick={() => onSelect(asset.url)}
              className={cn(
                "box-border w-full cursor-pointer whitespace-nowrap rounded-[10px] border px-3 py-[9px] text-left text-[13px] font-bold transition-colors",
                selected
                  ? "border-[#8069FF] bg-[rgba(128,105,255,0.16)] text-[#8069FF]"
                  : "border-white/[0.09] text-[#F5F4FB] hover:bg-white/[0.04]",
              )}
            >
              {asset.display_name}
            </button>
          );
        })}
        {allowCustomLogo && onUpload ? (
          <>
            <div className="my-0.5 h-px bg-white/[0.09]" />
            <button
              type="button"
              onClick={() => document.getElementById(fileInputId)?.click()}
              className="box-border flex w-full cursor-pointer items-center gap-2 rounded-[10px] border border-white/[0.09] px-3 py-[9px] text-left text-[13px] font-bold text-[#F5F4FB] hover:bg-white/[0.04]"
            >
              <Upload className="size-[17px] shrink-0" strokeWidth={2} />
              Upload new…
            </button>
            <input
              id={fileInputId}
              type="file"
              accept="image/*"
              onChange={onUpload}
              className="sr-only"
            />
          </>
        ) : null}
      </div>
    </FloatPanel>
  );
}

function LogoFloatControls({
  logoAssets,
  logoSize,
  setLogoSize,
  logoOpacity,
  setLogoOpacity,
  onSelectLogo,
  selectedUrl,
  allowCustomLogo,
  onUploadLogo,
}: {
  logoAssets: LogoAsset[];
  logoSize: number;
  setLogoSize: (n: number) => void;
  logoOpacity: number;
  setLogoOpacity: (n: number) => void;
  onSelectLogo: (url: string) => void;
  selectedUrl?: string | null;
  allowCustomLogo?: boolean;
  onUploadLogo?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [expand, setExpand] = useState<"select" | "opacity" | "size" | null>(null);

  return (
    <div className="relative flex flex-col items-center gap-2">
      {expand ? (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2">
          {expand === "select" ? (
            <LogoSelectPanel
              logoAssets={logoAssets}
              selectedUrl={selectedUrl}
              allowCustomLogo={allowCustomLogo}
              onUpload={onUploadLogo}
              uploadInputId="logoMobileUploadControls"
              onSelect={(url) => {
                onSelectLogo(url);
                setExpand(null);
              }}
            />
          ) : (
            <FloatPanel compact>
              <MobileFloatSliderRow
                value={expand === "size" ? logoSize : logoOpacity}
                displayValue={expand === "size" ? `${logoSize}px` : `${logoOpacity}%`}
                min={expand === "size" ? 50 : 0}
                max={expand === "size" ? 400 : 100}
                step={expand === "size" ? 10 : 1}
                onChange={expand === "size" ? setLogoSize : setLogoOpacity}
              />
            </FloatPanel>
          )}
        </div>
      ) : null}

      <FloatPill>
        <button
          type="button"
          onClick={() => setExpand(expand === "select" ? null : "select")}
          className={cn(
            "inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-bold",
            expand === "select" ? "text-[#8069FF]" : "text-[#F5F4FB]",
          )}
        >
          <Image className="size-[17px]" strokeWidth={2} />
          Select
        </button>
        <PillDivider />
        <button
          type="button"
          onClick={() => setExpand(expand === "opacity" ? null : "opacity")}
          className={cn(
            "inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-bold",
            expand === "opacity" ? "text-[#8069FF]" : "text-[#F5F4FB]",
          )}
        >
          <Droplet className="size-[17px]" strokeWidth={2} />
          {logoOpacity}%
        </button>
        <PillDivider />
        <PillBtn
          label="Resize"
          size={38}
          active={expand === "size"}
          onClick={() => setExpand(expand === "size" ? null : "size")}
        >
          <Maximize2 className="size-[17px]" strokeWidth={2} />
        </PillBtn>
      </FloatPill>
    </div>
  );
}

function QrFloatControls({
  qrSize,
  setQrSize,
  qrOpacity,
  setQrOpacity,
  onEditLink,
}: {
  qrSize: number;
  setQrSize: (n: number) => void;
  qrOpacity: number;
  setQrOpacity: (n: number) => void;
  onEditLink: () => void;
}) {
  const [expand, setExpand] = useState<"opacity" | "size" | null>(null);

  return (
    <div className="relative flex flex-col items-center gap-2">
      {expand ? (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2">
          <FloatPanel compact>
            <MobileFloatSliderRow
              value={expand === "size" ? qrSize : qrOpacity}
              displayValue={expand === "size" ? `${qrSize}px` : `${qrOpacity}%`}
              min={expand === "size" ? 50 : 0}
              max={expand === "size" ? 400 : 100}
              step={expand === "size" ? 10 : 1}
              onChange={expand === "size" ? setQrSize : setQrOpacity}
            />
          </FloatPanel>
        </div>
      ) : null}

      <FloatPill>
        <button
          type="button"
          onClick={onEditLink}
          className="inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-[#F5F4FB]"
        >
          <Link className="size-[17px]" strokeWidth={2} />
          Edit link
        </button>
        <PillDivider />
        <button
          type="button"
          onClick={() => setExpand(expand === "opacity" ? null : "opacity")}
          className={cn(
            "inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-bold",
            expand === "opacity" ? "text-[#8069FF]" : "text-[#F5F4FB]",
          )}
        >
          <Droplet className="size-[17px]" strokeWidth={2} />
          {qrOpacity}%
        </button>
        <PillDivider />
        <PillBtn
          label="Resize"
          size={38}
          active={expand === "size"}
          onClick={() => setExpand(expand === "size" ? null : "size")}
        >
          <Maximize2 className="size-[17px]" strokeWidth={2} />
        </PillBtn>
      </FloatPill>
    </div>
  );
}

function ShapeColorPanel({
  color,
  onChange,
}: {
  color: RgbaColor;
  onChange: (c: RgbaColor) => void;
}) {
  const colorHex = color.a === 0 ? null : rgbaToHex(color);

  return (
    <FloatPanel compact>
      <div className="flex items-center gap-1.5">
        {SHAPE_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onChange(hexToRgba(c))}
            className={cn(
              "size-8 shrink-0 cursor-pointer rounded-full border-2 box-border",
              c === colorHex ? "border-[#8069FF]" : "border-white/[0.17]",
            )}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="mt-2.5">
        <HueBar
          onPick={(hsl) => {
            const picked = hslToRgba(hsl);
            if (picked) onChange(picked);
          }}
        />
      </div>
    </FloatPanel>
  );
}

function ShapeFloatControls({
  shapeFillColor,
  setShapeFillColor,
  shapeStrokeColor,
  setShapeStrokeColor,
  shapeStrokeWidth,
  setShapeStrokeWidth,
  shapeOpacity,
  setShapeOpacity,
}: {
  shapeFillColor: RgbaColor;
  setShapeFillColor: (c: RgbaColor) => void;
  shapeStrokeColor: RgbaColor;
  setShapeStrokeColor: (c: RgbaColor) => void;
  shapeStrokeWidth: number;
  setShapeStrokeWidth: (n: number) => void;
  shapeOpacity: number;
  setShapeOpacity: (n: number) => void;
}) {
  const [expand, setExpand] = useState<"fill" | "stroke" | "width" | "opacity" | null>(null);
  const fillHex = rgbaToString(shapeFillColor);
  const strokeHex = rgbaToString(shapeStrokeColor);

  return (
    <div className="relative flex flex-col items-center gap-2">
      {expand ? (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2">
          {expand === "fill" ? (
            <ShapeColorPanel color={shapeFillColor} onChange={setShapeFillColor} />
          ) : expand === "stroke" ? (
            <ShapeColorPanel color={shapeStrokeColor} onChange={setShapeStrokeColor} />
          ) : (
            <FloatPanel compact>
              <MobileFloatSliderRow
                value={expand === "width" ? shapeStrokeWidth : shapeOpacity}
                displayValue={
                  expand === "width" ? `${shapeStrokeWidth}px` : `${shapeOpacity}%`
                }
                min={
                  expand === "width"
                    ? SHAPE_RANGES.STROKE_WIDTH_MIN
                    : SHAPE_RANGES.OPACITY_MIN
                }
                max={
                  expand === "width"
                    ? SHAPE_RANGES.STROKE_WIDTH_MAX
                    : SHAPE_RANGES.OPACITY_MAX
                }
                step={1}
                onChange={expand === "width" ? setShapeStrokeWidth : setShapeOpacity}
              />
            </FloatPanel>
          )}
        </div>
      ) : null}

      <FloatPill>
        <button
          type="button"
          title="Fill colour"
          aria-label="Fill colour"
          onClick={() => setExpand(expand === "fill" ? null : "fill")}
          className={cn(
            "inline-flex size-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border-2 box-border",
            expand === "fill" ? "border-[#8069FF]" : "border-white/[0.17]",
          )}
        >
          <span
            className="size-6 rounded-full border border-black/25"
            style={{ background: fillHex }}
          />
        </button>
        <PillDivider />
        <button
          type="button"
          title="Border colour"
          aria-label="Border colour"
          onClick={() => setExpand(expand === "stroke" ? null : "stroke")}
          className={cn(
            "inline-flex size-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border-2 box-border",
            expand === "stroke" ? "border-[#8069FF]" : "border-transparent",
          )}
        >
          <span
            className="size-[26px] rounded-full border-[3px] box-border"
            style={{ borderColor: strokeHex }}
          />
        </button>
        <PillDivider />
        <button
          type="button"
          onClick={() => setExpand(expand === "width" ? null : "width")}
          className={cn(
            "inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-bold",
            expand === "width" ? "text-[#8069FF]" : "text-[#F5F4FB]",
          )}
        >
          <span className="flex w-[17px] flex-col gap-[3px]">
            <span
              className="rounded-full bg-current"
              style={{ height: Math.max(1, Math.min(4, shapeStrokeWidth)) }}
            />
            <span className="h-0 border-t-2 border-dotted border-current" />
          </span>
          {shapeStrokeWidth}px
        </button>
        <PillDivider />
        <button
          type="button"
          onClick={() => setExpand(expand === "opacity" ? null : "opacity")}
          className={cn(
            "inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-bold",
            expand === "opacity" ? "text-[#8069FF]" : "text-[#F5F4FB]",
          )}
        >
          <Droplet className="size-[17px]" strokeWidth={2} />
          {shapeOpacity}%
        </button>
      </FloatPill>
    </div>
  );
}

function ShapeFloatEntry({ onAddShape }: { onAddShape: (type: ShapeType) => void }) {
  const [expand, setExpand] = useState(false);

  return (
    <div className="relative flex flex-col items-center gap-2">
      {expand ? (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2">
          <FloatPanel compact className="w-[min(300px,calc(100vw-2rem))]">
            <ShapeMobilePicker
              compact
              onAddShape={(type) => {
                onAddShape(type);
                setExpand(false);
              }}
            />
          </FloatPanel>
        </div>
      ) : null}
      <FloatPill>
        <button
          type="button"
          onClick={() => setExpand((v) => !v)}
          className={cn(
            "inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-bold",
            expand ? "text-[#8069FF]" : "text-[#F5F4FB]",
          )}
        >
          <Shapes className="size-[17px]" strokeWidth={2} />
          Add shape
        </button>
      </FloatPill>
    </div>
  );
}

function FrameFloatControls({
  filteredFrameAssets,
  frameOpacity,
  setFrameOpacity,
  onSelectFrame,
  selectedUrl,
}: {
  filteredFrameAssets: FrameAsset[];
  frameOpacity: number;
  setFrameOpacity: (n: number) => void;
  onSelectFrame: (url: string) => void;
  selectedUrl?: string | null;
}) {
  const [expand, setExpand] = useState<"opacity" | "frame" | null>(null);

  return (
    <div className="relative flex flex-col items-center gap-2">
      {expand ? (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2">
          {expand === "frame" ? (
            <FloatPanel compact className="w-[min(300px,calc(100vw-2rem))]">
              <div className="vs-noscroll grid max-h-[220px] grid-cols-3 gap-2 overflow-y-auto">
                {filteredFrameAssets.map((asset) => {
                  const selected = selectedUrl === asset.url;
                  return (
                    <button
                      key={asset.url}
                      type="button"
                      onClick={() => {
                        onSelectFrame(asset.url);
                        setExpand(null);
                      }}
                      className={cn(
                        "relative aspect-square cursor-pointer overflow-hidden rounded-[10px] border bg-[#0E0D18] transition-colors",
                        selected
                          ? "border-[#8069FF] shadow-[0_0_0_1px_#8069FF]"
                          : "border-white/[0.09] hover:border-[#8069FF]",
                      )}
                      title={asset.display_name}
                    >
                      <NextImage
                        src={asset.url}
                        alt={asset.display_name}
                        fill
                        sizes="120px"
                        className="object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </FloatPanel>
          ) : (
            <FloatPanel compact>
              <MobileFloatSliderRow
                value={frameOpacity}
                displayValue={`${frameOpacity}%`}
                min={10}
                max={100}
                step={5}
                onChange={setFrameOpacity}
              />
            </FloatPanel>
          )}
        </div>
      ) : null}
      <FloatPill>
        <button
          type="button"
          onClick={() => setExpand(expand === "frame" ? null : "frame")}
          className={cn(
            "inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-bold",
            expand === "frame" ? "text-[#8069FF]" : "text-[#F5F4FB]",
          )}
        >
          <span className="inline-flex size-[17px] shrink-0 items-center justify-center">
            <FrameItem />
          </span>
          Change frame
        </button>
        <PillDivider />
        <button
          type="button"
          onClick={() => setExpand(expand === "opacity" ? null : "opacity")}
          className={cn(
            "inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-bold",
            expand === "opacity" ? "text-[#8069FF]" : "text-[#F5F4FB]",
          )}
        >
          <Droplet className="size-[17px]" strokeWidth={2} />
          {frameOpacity}%
        </button>
      </FloatPill>
    </div>
  );
}

function FrameFloatEntry({
  filteredFrameAssets,
  onInsertFrame,
}: {
  filteredFrameAssets: FrameAsset[];
  onInsertFrame: (url: string) => void;
}) {
  const [expand, setExpand] = useState(false);

  return (
    <div className="relative flex flex-col items-center gap-2">
      {expand ? (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2">
          <FloatPanel compact className="w-[min(300px,calc(100vw-2rem))]">
            <div className="vs-noscroll grid max-h-[220px] grid-cols-3 gap-2 overflow-y-auto">
              {filteredFrameAssets.map((asset) => (
                <button
                  key={asset.url}
                  type="button"
                  onClick={() => {
                    onInsertFrame(asset.url);
                    setExpand(false);
                  }}
                  className="relative aspect-square cursor-pointer overflow-hidden rounded-[10px] border border-white/[0.09] bg-[#0E0D18] transition-colors hover:border-[#8069FF]"
                  title={asset.display_name}
                >
                  <NextImage
                    src={asset.url}
                    alt={asset.display_name}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </FloatPanel>
        </div>
      ) : null}
      <FloatPill>
        <button
          type="button"
          onClick={() => setExpand((v) => !v)}
          className={cn(
            "inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-bold",
            expand ? "text-[#8069FF]" : "text-[#F5F4FB]",
          )}
        >
          <span className="inline-flex size-[17px] shrink-0 items-center justify-center">
            <FrameItem />
          </span>
          Select frame
        </button>
      </FloatPill>
    </div>
  );
}

export function QrMobileSheetPanel({
  qrUrl,
  setQrUrl,
  onGenerate,
  onUpload,
  editMode,
  groupQr,
}: {
  qrUrl: string;
  setQrUrl: (s: string) => void;
  onGenerate: () => void | Promise<void>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  editMode?: boolean;
  groupQr?: {
    label: string | null;
    hasGroupQr: boolean;
    onInsert: () => void | Promise<void>;
    isInserting?: boolean;
  } | null;
}) {
  const showGroupQr = !editMode && !!groupQr?.hasGroupQr;

  return (
    <div className={studioForm.section}>
      {showGroupQr ? (
        <>
          <button
            type="button"
            onClick={() => void groupQr.onInsert()}
            disabled={groupQr.isInserting}
            className={studioForm.primaryButton}
          >
            {groupQr.isInserting
              ? "Adding…"
              : groupQr.label
                ? `Add ${groupQr.label} QR`
                : "Add group QR"}
          </button>
          <StudioOrDivider />
        </>
      ) : null}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter URL to generate…"
          value={qrUrl}
          onChange={(e) => setQrUrl(e.target.value)}
          className={cn(studioForm.input, "min-w-0 flex-1")}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onGenerate();
          }}
        />
        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={!qrUrl.trim()}
          className={studioForm.inlinePrimaryButton}
        >
          {editMode ? "Update" : "Generate"}
        </button>
      </div>

      {!editMode ? (
        <>
          <StudioOrDivider />
          <button
            type="button"
            onClick={() => document.getElementById("qrMobileFileInput")?.click()}
            className={studioForm.primaryButton}
          >
            Upload QR Image
          </button>
          <input
            id="qrMobileFileInput"
            type="file"
            accept="image/*"
            onChange={onUpload}
            className="sr-only"
          />
        </>
      ) : null}
    </div>
  );
}

function TextFloatEntry({
  onAddText,
  disabled,
}: {
  onAddText: () => void;
  disabled?: boolean;
}) {
  return (
    <FloatPill>
      <button
        type="button"
        onClick={onAddText}
        disabled={disabled}
        className="inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-[13px] font-bold text-[#F5F4FB] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled ? (
          <Loader2 className="size-[17px] animate-spin" aria-hidden />
        ) : (
          <Type className="size-[17px]" strokeWidth={2} />
        )}
        Add a text box
      </button>
    </FloatPill>
  );
}

function LogoFloatEntry({
  logoAssets,
  onInsertLogo,
  allowCustomLogo,
  onUploadLogo,
}: {
  logoAssets: LogoAsset[];
  onInsertLogo: (url: string) => void;
  allowCustomLogo?: boolean;
  onUploadLogo?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [expand, setExpand] = useState(false);

  return (
    <div className="relative flex flex-col items-center gap-2">
      {expand ? (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2">
          <LogoSelectPanel
            logoAssets={logoAssets}
            allowCustomLogo={allowCustomLogo}
            onUpload={onUploadLogo}
            uploadInputId="logoMobileUploadEntry"
            onSelect={(url) => {
              onInsertLogo(url);
              setExpand(false);
            }}
          />
        </div>
      ) : null}
      <FloatPill>
        <button
          type="button"
          onClick={() => setExpand((v) => !v)}
          className={cn(
            "inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-bold",
            expand ? "text-[#8069FF]" : "text-[#F5F4FB]",
          )}
        >
          <Image className="size-[17px]" strokeWidth={2} />
          Select logo
        </button>
      </FloatPill>
    </div>
  );
}

export interface StudioMobileFloatControlsProps {
  toolMode: MobileFloatTarget;
  hasSelection: boolean;
  fontAssets: FontAsset[];
  onAddText: () => void;
  addTextDisabled?: boolean;
  textTools: {
    fontFamily: string;
    setFontFamily: (v: string) => void;
    fontSize: number;
    setFontSize: (v: number) => void;
    isBold: boolean;
    setIsBold: (v: boolean) => void;
    isItalic: boolean;
    setIsItalic: (v: boolean) => void;
    isUnderline: boolean;
    setIsUnderline: (v: boolean) => void;
    textAlign: "left" | "center" | "right";
    setTextAlign: (v: "left" | "center" | "right") => void;
    textColor: RgbaColor;
    setTextColor: (c: RgbaColor) => void;
    backgroundColor: RgbaColor;
    setBackgroundColor: (c: RgbaColor) => void;
    lineHeight: number;
    setLineHeight: (n: number) => void;
    googleCatalogFonts: GoogleFontCatalogEntry[];
    googleCatalogLoading?: boolean;
  };
  logoTools: {
    filteredLogoAssets: LogoAsset[];
    logoSize: number;
    setLogoSize: (n: number) => void;
    logoOpacity: number;
    setLogoOpacity: (n: number) => void;
    onSelectLogo: (url: string) => void;
    onInsertLogo: (url: string) => void;
    selectedLogoUrl?: string | null;
    allowCustomLogo?: boolean;
    onUploadLogo?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
  qrTools?: {
    qrSize: number;
    setQrSize: (n: number) => void;
    qrOpacity: number;
    setQrOpacity: (n: number) => void;
    onEditLink: () => void;
  };
  shapeTools?: {
    shapeFillColor: RgbaColor;
    setShapeFillColor: (c: RgbaColor) => void;
    shapeStrokeColor: RgbaColor;
    setShapeStrokeColor: (c: RgbaColor) => void;
    shapeStrokeWidth: number;
    setShapeStrokeWidth: (n: number) => void;
    shapeOpacity: number;
    setShapeOpacity: (n: number) => void;
    onAddShape: (type: ShapeType) => void;
  };
  frameTools?: {
    filteredFrameAssets: FrameAsset[];
    frameOpacity: number;
    setFrameOpacity: (n: number) => void;
    onSelectFrame: (url: string) => void;
    onInsertFrame: (url: string) => void;
    selectedFrameUrl?: string | null;
  };
}

export function StudioMobileFloatControls({
  toolMode,
  hasSelection,
  fontAssets,
  onAddText,
  addTextDisabled,
  textTools,
  logoTools,
  qrTools,
  shapeTools,
  frameTools,
}: StudioMobileFloatControlsProps) {
  const content =
    toolMode === "text" ? (
      hasSelection ? (
        <TextFloatControls fontAssets={fontAssets} {...textTools} />
      ) : (
        <TextFloatEntry onAddText={onAddText} disabled={addTextDisabled} />
      )
    ) : toolMode === "logo" ? (
      hasSelection ? (
        <LogoFloatControls
          logoAssets={logoTools.filteredLogoAssets}
          logoSize={logoTools.logoSize}
          setLogoSize={logoTools.setLogoSize}
          logoOpacity={logoTools.logoOpacity}
          setLogoOpacity={logoTools.setLogoOpacity}
          onSelectLogo={logoTools.onSelectLogo}
          selectedUrl={logoTools.selectedLogoUrl}
          allowCustomLogo={logoTools.allowCustomLogo}
          onUploadLogo={logoTools.onUploadLogo}
        />
      ) : (
        <LogoFloatEntry
          logoAssets={logoTools.filteredLogoAssets}
          onInsertLogo={logoTools.onInsertLogo}
          allowCustomLogo={logoTools.allowCustomLogo}
          onUploadLogo={logoTools.onUploadLogo}
        />
      )
    ) : toolMode === "shape" && shapeTools ? (
      hasSelection ? (
        <ShapeFloatControls
          shapeFillColor={shapeTools.shapeFillColor}
          setShapeFillColor={shapeTools.setShapeFillColor}
          shapeStrokeColor={shapeTools.shapeStrokeColor}
          setShapeStrokeColor={shapeTools.setShapeStrokeColor}
          shapeStrokeWidth={shapeTools.shapeStrokeWidth}
          setShapeStrokeWidth={shapeTools.setShapeStrokeWidth}
          shapeOpacity={shapeTools.shapeOpacity}
          setShapeOpacity={shapeTools.setShapeOpacity}
        />
      ) : (
        <ShapeFloatEntry onAddShape={shapeTools.onAddShape} />
      )
    ) : toolMode === "frame" && frameTools ? (
      hasSelection ? (
        <FrameFloatControls
          filteredFrameAssets={frameTools.filteredFrameAssets}
          frameOpacity={frameTools.frameOpacity}
          setFrameOpacity={frameTools.setFrameOpacity}
          onSelectFrame={frameTools.onSelectFrame}
          selectedUrl={frameTools.selectedFrameUrl}
        />
      ) : (
        <FrameFloatEntry
          filteredFrameAssets={frameTools.filteredFrameAssets}
          onInsertFrame={frameTools.onInsertFrame}
        />
      )
    ) : qrTools ? (
      <QrFloatControls
        qrSize={qrTools.qrSize}
        setQrSize={qrTools.setQrSize}
        qrOpacity={qrTools.qrOpacity}
        setQrOpacity={qrTools.setQrOpacity}
        onEditLink={qrTools.onEditLink}
      />
    ) : null;

  return (
    <div
      className="relative z-[6] shrink-0 px-3 pb-2 pt-2.5 md:hidden"
      style={{ background: UI_COLORS.CANVAS_MAT }}
    >
      <div className="flex justify-center overflow-visible">
        <div className="w-max max-w-full overflow-visible">{content}</div>
      </div>
    </div>
  );
}

export function StudioMobileDoneBar({ onDone }: { onDone: () => void }) {
  return (
    <div
      className="shrink-0 px-3.5 py-3 md:hidden"
      style={{ background: UI_COLORS.PRIMARY_BG, borderTop: `1px solid ${UI_COLORS.BORDER}` }}
    >
      <button
        type="button"
        onClick={onDone}
        className={cn(studioForm.primaryButton, "h-[52px] text-[15.5px]")}
      >
        <Check className="size-[19px]" strokeWidth={2.2} aria-hidden />
        Done
      </button>
    </div>
  );
}

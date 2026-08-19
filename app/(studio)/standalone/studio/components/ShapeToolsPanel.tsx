"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { HexColorPicker } from "react-colorful";
import { Paintbrush, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RgbaColor, ShapeType } from "../types/image-editor-types";
import type { EyedropperTarget } from "../hooks/use-eyedropper";
import { rgbaToString } from "../utils/image-editor-utils";
import { SHAPE_RANGES, UI_COLORS } from "../constants/editor-constants";
import { StudioColorControl, StudioSliderRow, studioForm } from "./studio-ui";

function rgbaToHex(color: RgbaColor): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function hexToRgba(hex: string, a = 1): RgbaColor {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b, a };
}

export interface ShapeToolsPanelProps {
  isShapeSelected: boolean;
  addShape: (type: ShapeType) => void;
  shapeFillColor: RgbaColor;
  setShapeFillColor: (c: RgbaColor) => void;
  shapeStrokeColor: RgbaColor;
  setShapeStrokeColor: (c: RgbaColor) => void;
  shapeStrokeWidth: number;
  setShapeStrokeWidth: (n: number) => void;
  shapeOpacity: number;
  setShapeOpacity: (n: number) => void;
  eyedropperTarget?: EyedropperTarget;
  onStartEyedropper?: (target: EyedropperTarget) => void;
}

const labelClassName = studioForm.label;

// SVG previews for each shape type
const ShapeSVGPreview: React.FC<{ type: ShapeType }> = ({ type }) => {
  const size = 32;
  const stroke = UI_COLORS.ACCENT;
  const fill = UI_COLORS.ACCENT_SOFT;
  const sw = 1.5;

  switch (type) {
    case "rectangle":
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <rect x="4" y="10" width="32" height="20" fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case "square":
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <rect x="8" y="8" width="24" height="24" fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case "rounded-rectangle":
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <rect x="4" y="10" width="32" height="20" rx="6" fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case "circle":
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="14" fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case "half-circle-right":
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <path d="M20 6 A14 14 0 0 1 20 34 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case "half-circle-left":
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <path d="M20 6 A14 14 0 0 0 20 34 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case "triangle":
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <polygon points="20,6 36,34 4,34" fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case "star":
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <polygon
            points="20,4 23.8,14.9 35.5,14.9 26.1,21.5 29.9,32.4 20,25.8 10.1,32.4 13.9,21.5 4.5,14.9 16.2,14.9"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
        </svg>
      );
    case "arrow":
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <path d="M4 16 L26 16 L26 10 L36 20 L26 30 L26 24 L4 24 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case "diamond":
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <polygon points="20,4 36,20 20,36 4,20" fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case "hexagon":
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <polygon
            points="20,4 33.9,12 33.9,28 20,36 6.1,28 6.1,12"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
        </svg>
      );
    case "cross":
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <path
            d="M15 4 L25 4 L25 15 L36 15 L36 25 L25 25 L25 36 L15 36 L15 25 L4 25 L4 15 L15 15 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
        </svg>
      );
    default:
      return null;
  }
};

const SHAPES: { type: ShapeType; label: string }[] = [
  { type: "rectangle", label: "Rectangle" },
  { type: "square", label: "Square" },
  { type: "circle", label: "Circle" },
  { type: "rounded-rectangle", label: "Rounded Rect" },
  { type: "triangle", label: "Triangle" },
  { type: "star", label: "Star" },
  { type: "diamond", label: "Diamond" },
  { type: "hexagon", label: "Hexagon" },
  { type: "half-circle-right", label: "Half Right" },
  { type: "half-circle-left", label: "Half Left" },
  { type: "arrow", label: "Arrow" },
  { type: "cross", label: "Cross" },
];

function useScrollState(ref: React.RefObject<HTMLDivElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref, update]);

  return { canScrollLeft, canScrollRight };
}

export const ShapeToolsPanel = React.memo(function ShapeToolsPanel({
  isShapeSelected,
  addShape,
  shapeFillColor,
  setShapeFillColor,
  shapeStrokeColor,
  setShapeStrokeColor,
  shapeStrokeWidth,
  setShapeStrokeWidth,
  shapeOpacity,
  setShapeOpacity,
  eyedropperTarget,
  onStartEyedropper,
}: ShapeToolsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight } = useScrollState(scrollRef);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 120 : -120, behavior: "smooth" });
  };

  return (
    <div className={cn(studioForm.section, "w-full")}>
      {/* Shape carousel */}
      <div>
        <Label className={cn(labelClassName, "mb-2")}>Add Shape</Label>
        <div className="relative">
          {/* Left fade + arrow */}
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 z-10 flex items-center pointer-events-none transition-opacity duration-200",
              canScrollLeft ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="h-full w-8 bg-gradient-to-r from-[#141220] to-transparent" />
            <button
              onClick={() => scroll("left")}
              className="pointer-events-auto absolute left-0 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.09] bg-[#211E30] text-[#8069FF] transition-colors hover:bg-[#2C2942] cursor-pointer"
              aria-label="Scroll left"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M6.5 2L3.5 5L6.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Scrollable row */}
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scroll-smooth pb-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {SHAPES.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => addShape(type)}
                className={cn(
                  "flex w-[60px] flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border py-2 transition-all",
                  "border-white/[0.09] bg-[#211E30]",
                  "hover:border-[#8069FF] hover:bg-[rgba(128,105,255,0.08)]",
                  "active:scale-[0.96]",
                )}
              >
                <ShapeSVGPreview type={type} />
                <span className="px-0.5 text-center text-[9px] font-medium leading-none text-[#726F86]">
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* Right fade + arrow */}
          <div
            className={cn(
              "absolute right-0 top-0 bottom-0 z-10 flex items-center pointer-events-none transition-opacity duration-200",
              canScrollRight ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="h-full w-8 bg-gradient-to-l from-[#141220] to-transparent" />
            <button
              onClick={() => scroll("right")}
              className="pointer-events-auto absolute right-0 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.09] bg-[#211E30] text-[#8069FF] transition-colors hover:bg-[#2C2942] cursor-pointer"
              aria-label="Scroll right"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className={studioForm.divider} />

      {/* Color pickers */}
      <div className={studioForm.colorControlGroup}>
        <StudioColorControl
          label="Fill color"
          color={rgbaToString(shapeFillColor)}
          disabled={!isShapeSelected}
          icon={<Paintbrush className="size-[18px]" strokeWidth={2} />}
          eyedropperActive={eyedropperTarget === "shapeFill"}
          onStartEyedropper={
            onStartEyedropper ? () => onStartEyedropper("shapeFill") : undefined
          }
        >
          <HexColorPicker
            color={rgbaToHex(shapeFillColor)}
            onChange={(hex) => setShapeFillColor(hexToRgba(hex, shapeFillColor.a))}
          />
        </StudioColorControl>
        <StudioColorControl
          label="Border color"
          color={rgbaToString(shapeStrokeColor)}
          disabled={!isShapeSelected}
          icon={<Square className="size-[18px]" strokeWidth={2} />}
          eyedropperActive={eyedropperTarget === "shapeStroke"}
          onStartEyedropper={
            onStartEyedropper ? () => onStartEyedropper("shapeStroke") : undefined
          }
        >
          <HexColorPicker
            color={rgbaToHex(shapeStrokeColor)}
            onChange={(hex) => setShapeStrokeColor(hexToRgba(hex, shapeStrokeColor.a))}
          />
        </StudioColorControl>
      </div>

      {/* Border Width */}
      <StudioSliderRow
        label="Border Width"
        value={shapeStrokeWidth}
        displayValue={`${shapeStrokeWidth}px`}
        min={SHAPE_RANGES.STROKE_WIDTH_MIN}
        max={SHAPE_RANGES.STROKE_WIDTH_MAX}
        step={1}
        onChange={setShapeStrokeWidth}
        disabled={!isShapeSelected}
      />

      {/* Opacity */}
      <StudioSliderRow
        label="Opacity"
        value={shapeOpacity}
        displayValue={`${shapeOpacity}%`}
        min={SHAPE_RANGES.OPACITY_MIN}
        max={SHAPE_RANGES.OPACITY_MAX}
        step={1}
        onChange={setShapeOpacity}
        disabled={!isShapeSelected}
      />
    </div>
  );
});

export function ShapeMobilePicker({
  onAddShape,
  compact,
}: {
  onAddShape: (type: ShapeType) => void;
  compact?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight } = useScrollState(scrollRef);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 120 : -120, behavior: "smooth" });
  };

  return (
    <div className={cn("w-full", compact ? "" : studioForm.section)}>
      {!compact ? (
        <p className="mb-2.5 text-[12.5px] font-semibold text-[#726F86]">
          Tap a shape to add it to the canvas.
        </p>
      ) : null}
      <div className="relative">
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 z-10 flex items-center pointer-events-none transition-opacity duration-200",
            canScrollLeft ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="h-full w-6 bg-gradient-to-r from-[rgba(33,30,48,0.94)] to-transparent" />
          <button
            type="button"
            onClick={() => scroll("left")}
            className="pointer-events-auto absolute left-0 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.09] bg-[#211E30] text-[#8069FF] cursor-pointer"
            aria-label="Scroll left"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M6.5 2L3.5 5L6.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scroll-smooth pb-0.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {SHAPES.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => onAddShape(type)}
                className={cn(
                  "flex w-[56px] flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border py-2 transition-all",
                  "border-white/[0.09] bg-[#211E30]",
                  "hover:border-[#8069FF] hover:bg-[rgba(128,105,255,0.08)]",
                  "active:scale-[0.96]",
                )}
            >
              <ShapeSVGPreview type={type} />
              <span className="px-0.5 text-center text-[9px] font-medium leading-none text-[#726F86]">
                {label}
              </span>
            </button>
          ))}
        </div>

        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 z-10 flex items-center pointer-events-none transition-opacity duration-200",
            canScrollRight ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="h-full w-6 bg-gradient-to-l from-[rgba(33,30,48,0.94)] to-transparent" />
          <button
            type="button"
            onClick={() => scroll("right")}
            className="pointer-events-auto absolute right-0 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.09] bg-[#211E30] text-[#8069FF] cursor-pointer"
            aria-label="Scroll right"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

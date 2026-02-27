"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { HexColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { RgbaColor, ShapeType } from "../types/image-editor-types";
import { rgbaToString } from "../utils/image-editor-utils";
import { SHAPE_RANGES } from "../constants/editor-constants";

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
}

const sliderClassName = cn(
  "w-full",
  "[&_[data-slot=slider-track]]:bg-[#303030c4]",
  "[&_[data-slot=slider-range]]:bg-[#5C38F3_!important]",
  "[&_[role=slider]]:bg-[#FFF] [&_[role=slider]]:border-[1px] [&_[role=slider]]:border-[#9094A4]"
);

const labelClassName =
  "text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block";

const valueBoxClassName =
  "p-[5px] rounded-[5px] border border-[#303030] font-(family-name:--font-manrope) text-[13px] font-medium leading-[135%] text-[#929292] text-center transition-colors hover:border-[#444]";

// SVG previews for each shape type
const ShapeSVGPreview: React.FC<{ type: ShapeType }> = ({ type }) => {
  const size = 40;
  const stroke = "#9BFFCA";
  const fill = "rgba(155,255,202,0.15)";
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
}: ShapeToolsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight } = useScrollState(scrollRef);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "right" ? 120 : -120, behavior: "smooth" });
  };

  return (
    <div className="space-y-5 w-full">
      {/* Shape carousel */}
      <div>
        <Label className={cn(labelClassName, "mb-3")}>Add Shape</Label>
        <div className="relative">
          {/* Left fade + arrow */}
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 z-10 flex items-center pointer-events-none transition-opacity duration-200",
              canScrollLeft ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="w-8 h-full bg-gradient-to-r from-[#0D0D0D] to-transparent" />
            <button
              onClick={() => scroll("left")}
              className="pointer-events-auto absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-[#2A2A2A] border border-[#3D3D3D] text-[#9BFFCA] hover:bg-[#333] transition-colors cursor-pointer"
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
                  "flex flex-col items-center justify-center gap-1.5 py-3 rounded-[8px] border transition-all cursor-pointer flex-shrink-0",
                  "bg-[#1A1A1A] border-[#2D2D2D]",
                  "hover:border-[#9BFFCA] hover:bg-[#1F2B24]",
                  "active:scale-[0.96]",
                  "w-[72px]"
                )}
              >
                <ShapeSVGPreview type={type} />
                <span className="text-[10px] font-medium text-[#929292] font-(family-name:--font-manrope) leading-none text-center px-1">
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
            <div className="w-8 h-full bg-gradient-to-l from-[#0D0D0D] to-transparent" />
            <button
              onClick={() => scroll("right")}
              className="pointer-events-auto absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-[#2A2A2A] border border-[#3D3D3D] text-[#9BFFCA] hover:bg-[#333] transition-colors cursor-pointer"
              aria-label="Scroll right"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full h-[1px] bg-[#2D2D2D]" />

      {/* Color pickers */}
      <div className="flex gap-[50px]">
        {/* Fill Color */}
        <div>
          <Label className={cn(labelClassName, "mb-2")}>Fill Color</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={!isShapeSelected}
                className="w-full justify-start gap-[14px] px-0 cursor-pointer bg-transparent border-none group hover:bg-transparent"
              >
                <div
                  className="w-8 h-8 rounded-full border-2 border-[#C5CAD9] shadow-sm transition-transform"
                  style={{ backgroundColor: rgbaToString(shapeFillColor) }}
                />
                <div className="flex flex-col gap-[2px] items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M2 17.0588H4.82353M11.4118 17.0588H18M4.72941 12.3529H11.2235M7.83529 4.16471L13.2941 17.0588M2.94118 17.0588L8.58823 2H10.4706L17.0588 17.0588" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="h-[2px] w-[20px] bg-[#E5E5EF]" />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <HexColorPicker
                color={rgbaToHex(shapeFillColor)}
                onChange={(hex) => setShapeFillColor(hexToRgba(hex, 1))}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Stroke Color */}
        <div>
          <Label className={cn(labelClassName, "mb-2")}>Border Color</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={!isShapeSelected}
                className="w-full justify-start gap-[14px] px-0 cursor-pointer bg-transparent border-none group hover:bg-transparent"
              >
                <div
                  className="w-8 h-8 rounded-full border-2 border-[#C5CAD9] shadow-sm transition-transform"
                  style={{ backgroundColor: rgbaToString(shapeStrokeColor) }}
                />
                <div className="rounded-[3px] bg-white p-[4px] h-[28px] w-[28px] flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M2 17.0588H4.82353M11.4118 17.0588H18M4.72941 12.3529H11.2235M7.83529 4.16471L13.2941 17.0588M2.94118 17.0588L8.58823 2H10.4706L17.0588 17.0588" stroke="#191919" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <HexColorPicker
                color={rgbaToHex(shapeStrokeColor)}
                onChange={(hex) => setShapeStrokeColor(hexToRgba(hex, 1))}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Border Width */}
      <div className="grid grid-cols-[auto_1fr_40px] gap-[11px] items-center">
        <Label className={labelClassName}>Border Width</Label>
        <Slider
          value={[shapeStrokeWidth]}
          onValueChange={([value]) => setShapeStrokeWidth(value)}
          min={SHAPE_RANGES.STROKE_WIDTH_MIN}
          max={SHAPE_RANGES.STROKE_WIDTH_MAX}
          step={1}
          disabled={!isShapeSelected}
          className={sliderClassName}
        />
        <div className={valueBoxClassName}>{shapeStrokeWidth}px</div>
      </div>

      {/* Opacity */}
      <div className="grid grid-cols-[auto_1fr_40px] gap-[11px] items-center">
        <Label className={labelClassName}>Opacity</Label>
        <Slider
          value={[shapeOpacity]}
          onValueChange={([value]) => setShapeOpacity(value)}
          min={SHAPE_RANGES.OPACITY_MIN}
          max={SHAPE_RANGES.OPACITY_MAX}
          step={1}
          disabled={!isShapeSelected}
          className={sliderClassName}
        />
        <div className={valueBoxClassName}>{shapeOpacity}%</div>
      </div>
    </div>
  );
});

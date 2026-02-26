"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PlusIcon } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { RgbaColor } from "../types/image-editor-types";
import { rgbaToString } from "../utils/image-editor-utils";

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
import { SHAPE_RANGES } from "../constants/editor-constants";

export interface ShapeToolsPanelProps {
  isRectSelected: boolean;
  addRect: () => void;
  rectFillColor: RgbaColor;
  setRectFillColor: (c: RgbaColor) => void;
  rectStrokeColor: RgbaColor;
  setRectStrokeColor: (c: RgbaColor) => void;
  rectStrokeWidth: number;
  setRectStrokeWidth: (n: number) => void;
  rectOpacity: number;
  setRectOpacity: (n: number) => void;
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

export const ShapeToolsPanel = React.memo(function ShapeToolsPanel({
  isRectSelected,
  addRect,
  rectFillColor,
  setRectFillColor,
  rectStrokeColor,
  setRectStrokeColor,
  rectStrokeWidth,
  setRectStrokeWidth,
  rectOpacity,
  setRectOpacity,
}: ShapeToolsPanelProps) {
  return (
    <div className="space-y-5 w-full">
      <Button
        onClick={addRect}
        className="w-full h-[44px] bg-[#5C38F3] text-white shadow-md cursor-pointer text-[15px] leading-[160%] font-semibold font-(family-name:--font-manrope) rounded-[10px] transition-all hover:bg-[#4A2DD1] hover:shadow-lg active:scale-[0.98]"
      >
        <PlusIcon />
        Add Rectangle
      </Button>

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
                disabled={!isRectSelected}
                className="w-full justify-start gap-[14px] px-0 cursor-pointer bg-transparent border-none group hover:bg-transparent"
              >
                <div
                  className="w-8 h-8 rounded-full border-2 border-[#C5CAD9] shadow-sm transition-transform"
                  style={{ backgroundColor: rgbaToString(rectFillColor) }}
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
                color={rgbaToHex(rectFillColor)}
                onChange={(hex) => setRectFillColor(hexToRgba(hex, 1))}
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
                disabled={!isRectSelected}
                className="w-full justify-start gap-[14px] px-0 cursor-pointer bg-transparent border-none group hover:bg-transparent"
              >
                <div
                  className="w-8 h-8 rounded-full border-2 border-[#C5CAD9] shadow-sm transition-transform"
                  style={{ backgroundColor: rgbaToString(rectStrokeColor) }}
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
                color={rgbaToHex(rectStrokeColor)}
                onChange={(hex) => setRectStrokeColor(hexToRgba(hex, 1))}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Border Width */}
      <div className="grid grid-cols-[auto_1fr_40px] gap-[11px] items-center">
        <Label className={labelClassName}>Border Width</Label>
        <Slider
          value={[rectStrokeWidth]}
          onValueChange={([value]) => setRectStrokeWidth(value)}
          min={SHAPE_RANGES.STROKE_WIDTH_MIN}
          max={SHAPE_RANGES.STROKE_WIDTH_MAX}
          step={1}
          disabled={!isRectSelected}
          className={sliderClassName}
        />
        <div className={valueBoxClassName}>{rectStrokeWidth}px</div>
      </div>

      {/* Opacity */}
      <div className="grid grid-cols-[auto_1fr_40px] gap-[11px] items-center">
        <Label className={labelClassName}>Opacity</Label>
        <Slider
          value={[rectOpacity]}
          onValueChange={([value]) => setRectOpacity(value)}
          min={SHAPE_RANGES.OPACITY_MIN}
          max={SHAPE_RANGES.OPACITY_MAX}
          step={1}
          disabled={!isRectSelected}
          className={sliderClassName}
        />
        <div className={valueBoxClassName}>{rectOpacity}%</div>
      </div>
    </div>
  );
});

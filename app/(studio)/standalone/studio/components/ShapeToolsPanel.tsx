"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PlusIcon } from "lucide-react";
import { RgbaColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { RgbaColor } from "../types/image-editor-types";
import { rgbaToString } from "../utils/image-editor-utils";

export interface ShapeToolsPanelProps {
  isRectSelected: boolean;
  addSnappyRect: () => void;
  rectFillColor: RgbaColor;
  setRectFillColor: (c: RgbaColor) => void;
  rectStrokeColor: RgbaColor;
  setRectStrokeColor: (c: RgbaColor) => void;
  rectStrokeWidth: number;
  setRectStrokeWidth: (n: number) => void;
  snapEnabled: boolean;
  setSnapEnabled: (b: boolean) => void;
  snapThreshold: number;
  setSnapThreshold: (n: number) => void;
}

export const ShapeToolsPanel = React.memo(function ShapeToolsPanel({
  isRectSelected,
  addSnappyRect,
  rectFillColor,
  setRectFillColor,
  rectStrokeColor,
  setRectStrokeColor,
  rectStrokeWidth,
  setRectStrokeWidth,
  snapEnabled,
  setSnapEnabled,
  snapThreshold,
  setSnapThreshold,
}: ShapeToolsPanelProps) {
  return (
    <div className="space-y-5 w-full">
      <Button
        onClick={addSnappyRect}
        className="w-full h-[44px] bg-[#5C38F3] text-white shadow-md cursor-pointer text-[15px] leading-[160%] font-semibold font-(family-name:--font-manrope) rounded-[10px] transition-all hover:bg-[#4A2DD1] hover:shadow-lg active:scale-[0.98]"
      >
        <PlusIcon />
        Add Rectangle
      </Button>
      <div className="w-full h-[1px] bg-[#2D2D2D]"></div>

      <div className="flex gap-[50px]">
        <div>
          <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block mb-2">
            Fill Color
          </Label>
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
                  <div className="h-[2px] w-[20px] bg-[#E5E5EF]"></div>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <RgbaColorPicker color={rectFillColor} onChange={setRectFillColor} />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block mb-2">
            Stroke Color
          </Label>
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
              <RgbaColorPicker color={rectStrokeColor} onChange={setRectStrokeColor} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr_40px] gap-[11px] items-center">
        <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block">
          Stroke Width
        </Label>
        <div>
          <Slider
            value={[rectStrokeWidth]}
            onValueChange={([value]) => setRectStrokeWidth(value)}
            min={0}
            max={20}
            step={1}
            className="w-full"
            disabled={!isRectSelected}
          />
        </div>
        <div className="p-[5px] rounded-[5px] border border-[#303030] font-(family-name:--font-manrope) text-[13px] font-medium leading-[135%] text-[#929292] text-center transition-colors hover:border-[#444]">
          {rectStrokeWidth}px
        </div>
      </div>

      <div className="w-full h-[1px] bg-[#2D2D2D]"></div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block">
            Enable Snapping
          </Label>
          <Button
            variant={snapEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setSnapEnabled(!snapEnabled)}
            disabled={!isRectSelected}
            className={cn(
              "h-[32px] cursor-pointer bg-[#191919] rounded-[10px] border border-[#2D2D2D] transition-all hover:bg-[#252525] hover:border-[#444] active:scale-95",
              snapEnabled && "bg-[#0D0D0D] border-[#5C38F3] shadow-sm"
            )}
          >
            {snapEnabled ? "On" : "Off"}
          </Button>
        </div>

        {snapEnabled && (
          <div className="grid grid-cols-[auto_1fr_40px] gap-[11px] items-center">
            <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block">
              Snap Threshold
            </Label>
            <div>
              <Slider
                value={[snapThreshold]}
                onValueChange={([value]) => setSnapThreshold(value)}
                min={1}
                max={20}
                step={1}
                className="w-full"
                disabled={!isRectSelected}
              />
            </div>
            <div className="p-[5px] rounded-[5px] border border-[#303030] font-(family-name:--font-manrope) text-[13px] font-medium leading-[135%] text-[#929292] text-center transition-colors hover:border-[#444]">
              {snapThreshold}px
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

"use client";

import React, { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FrameAsset } from "../types/image-editor-types";
import { FRAME_SHOW_BY_SIZE_OPTIONS } from "@/lib/aspect-ratios";
import { cn } from "@/lib/utils";

export interface FrameToolsPanelProps {
  frameAssets: FrameAsset[];
  aspectRatio: string | null;
  frameOpacity: number;
  setFrameOpacity: (n: number) => void;
  insertFrame: (url: string) => void;
  isFrameSelected: boolean;
}

function filterFramesBySize(frames: FrameAsset[], size: string): FrameAsset[] {
  if (size === "all") return frames;
  return frames.filter((asset) => {
    const v = asset.variant;
    if (!v) return false;
    if (v === "*") return true;
    const ratios = v.split(",").map((s) => s.trim()).filter(Boolean);
    return ratios.includes(size);
  });
}

export const FrameToolsPanel = React.memo(function FrameToolsPanel({
  frameAssets,
  aspectRatio,
  frameOpacity,
  setFrameOpacity,
  insertFrame,
  isFrameSelected,
}: FrameToolsPanelProps) {
  const hasAnyFrames = frameAssets.length > 0;

  const [showBySize, setShowBySize] = useState<string>(() => {
    if (aspectRatio && FRAME_SHOW_BY_SIZE_OPTIONS.some((o) => o.value === aspectRatio))
      return aspectRatio;
    return "all";
  });

  const filteredFrames = useMemo(
    () => filterFramesBySize(frameAssets, showBySize),
    [frameAssets, showBySize]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-[13px] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope)">
          Show by size
        </Label>
        <Select value={showBySize} onValueChange={setShowBySize}>
          <SelectTrigger className="w-full border-[#2D2D2D] bg-[#0D0D0D] text-[#F4F4F4] font-(family-name:--font-manrope)">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            {FRAME_SHOW_BY_SIZE_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!hasAnyFrames ? (
        <div className="py-6 text-center">
          <p className="text-[13px] text-[#929292] font-(family-name:--font-manrope)">
            No frames available
          </p>
        </div>
      ) : filteredFrames.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[13px] text-[#929292] font-(family-name:--font-manrope)">
            No frames for this size. Try &quot;All&quot; or another option.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredFrames.map((asset) => (
            <button
              key={asset.url}
              type="button"
              onClick={() => insertFrame(asset.url)}
              className="group relative aspect-square rounded-[8px] overflow-hidden border border-[#2D2D2D] bg-[#0D0D0D] transition-all hover:border-[#5C38F3] hover:shadow-[0_0_0_1px_#5C38F3] focus:outline-none focus:ring-2 focus:ring-[#5C38F3]/40 cursor-pointer"
              title={asset.display_name}
            >
              {/* Checkerboard background to show transparency */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)",
                  backgroundSize: "10px 10px",
                  backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.url}
                alt={asset.display_name}
                className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-[10px] font-medium leading-tight truncate font-(family-name:--font-manrope)">
                  {asset.display_name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "grid grid-cols-[auto_1fr_50px] gap-[11px] items-center",
          !isFrameSelected && "opacity-50 pointer-events-none"
        )}
      >
        <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block">
          Opacity
        </Label>
        <Slider
          value={[frameOpacity]}
          onValueChange={([value]) => setFrameOpacity(value)}
          min={10}
          max={100}
          step={5}
          disabled={!isFrameSelected}
          className={cn(
            "w-full",
            "[&_[data-slot=slider-track]]:bg-[#303030c4]",
            "[&_[data-slot=slider-range]]:bg-[#5C38F3_!important]",
            "[&_[role=slider]]:bg-[#FFF] [&_[role=slider]]:border-[1px] [&_[role=slider]]:border-[#9094A4]"
          )}
        />
        <div className="p-[5px] rounded-[5px] border border-[#303030] font-(family-name:--font-manrope) text-[13px] font-medium leading-[135%] text-[#929292] text-center transition-colors hover:border-[#444]">
          {frameOpacity}%
        </div>
      </div>
    </div>
  );
});

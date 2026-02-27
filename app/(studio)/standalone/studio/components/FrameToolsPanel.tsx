"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { FrameAsset } from "../types/image-editor-types";
import { cn } from "@/lib/utils";

export interface FrameToolsPanelProps {
  filteredFrameAssets: FrameAsset[];
  hasFrameAssets: boolean;
  aspectRatio: string | null;
  frameOpacity: number;
  setFrameOpacity: (n: number) => void;
  insertFrame: (url: string) => void;
  isFrameSelected: boolean;
}

export const FrameToolsPanel = React.memo(function FrameToolsPanel({
  filteredFrameAssets,
  hasFrameAssets,
  aspectRatio,
  frameOpacity,
  setFrameOpacity,
  insertFrame,
  isFrameSelected,
}: FrameToolsPanelProps) {
  return (
    <div className="space-y-4">
      {aspectRatio && (
        <p className="text-xs text-[#929292] font-(family-name:--font-manrope)">
          Showing frames for{" "}
          <span className="text-[#F4F4F4] font-semibold">{aspectRatio}</span>
        </p>
      )}

      {!hasFrameAssets ? (
        <div className="py-6 text-center">
          <p className="text-[13px] text-[#929292] font-(family-name:--font-manrope)">
            {aspectRatio
              ? `No frames available for ${aspectRatio}`
              : "No frames available"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredFrameAssets.map((asset) => (
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

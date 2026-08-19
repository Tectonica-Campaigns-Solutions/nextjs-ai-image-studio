"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
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
import { StudioPanelHint, StudioSliderRow, studioForm } from "./studio-ui";

export interface FrameToolsPanelProps {
  frameAssets: FrameAsset[];
  aspectRatio: string | null;
  frameOpacity: number;
  setFrameOpacity: (n: number) => void;
  insertFrame: (url: string) => void;
  isFrameSelected: boolean;
}

export function filterFramesBySize(frames: FrameAsset[], size: string): FrameAsset[] {
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
    <div className={studioForm.section}>
      <div className="flex flex-col gap-2">
        <span className={studioForm.label}>Show by size</span>
        <Select value={showBySize} onValueChange={setShowBySize}>
          <SelectTrigger className={studioForm.selectTriggerLarge}>
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent className={studioForm.selectContent}>
            {FRAME_SHOW_BY_SIZE_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value} className={studioForm.selectItem}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!hasAnyFrames ? (
        <StudioPanelHint>No frames available</StudioPanelHint>
      ) : filteredFrames.length === 0 ? (
        <StudioPanelHint>No frames for this size. Try &quot;All&quot; or another option.</StudioPanelHint>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filteredFrames.map((asset) => (
            <button
              key={asset.url}
              type="button"
              onClick={() => insertFrame(asset.url)}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-[10px] border border-white/[0.09] bg-[#0E0D18] transition-all hover:border-[#8069FF] hover:shadow-[0_0_0_1px_#8069FF] focus:outline-none focus:ring-2 focus:ring-[#8069FF]/40"
              title={asset.display_name}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)",
                  backgroundSize: "10px 10px",
                  backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
                }}
              />
              <Image
                src={asset.url}
                alt={asset.display_name}
                fill
                sizes="(max-width: 400px) 50vw, 200px"
                className="object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="truncate text-[10px] font-medium leading-tight text-white">
                  {asset.display_name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className={cn(!isFrameSelected && "pointer-events-none opacity-50")}>
        <StudioSliderRow
          label="Opacity"
          value={frameOpacity}
          displayValue={`${frameOpacity}%`}
          min={10}
          max={100}
          step={5}
          onChange={setFrameOpacity}
          disabled={!isFrameSelected}
        />
      </div>
    </div>
  );
});

export function FrameMobilePicker({
  frameAssets,
  aspectRatio,
  onInsertFrame,
  compact,
}: {
  frameAssets: FrameAsset[];
  aspectRatio: string | null;
  onInsertFrame: (url: string) => void;
  compact?: boolean;
}) {
  const [showBySize, setShowBySize] = useState<string>(() => {
    if (aspectRatio && FRAME_SHOW_BY_SIZE_OPTIONS.some((o) => o.value === aspectRatio)) {
      return aspectRatio;
    }
    return "all";
  });

  const filteredFrames = useMemo(
    () => filterFramesBySize(frameAssets, showBySize),
    [frameAssets, showBySize],
  );

  return (
    <div className={cn("w-full", compact ? "" : studioForm.section)}>
      {!compact ? (
        <p className="mb-2.5 text-[12.5px] font-semibold text-[#726F86]">
          Tap a frame to add it to the canvas.
        </p>
      ) : null}
      <div className="mb-3 flex flex-col gap-2">
        <span className={studioForm.label}>Show by size</span>
        <select
          value={showBySize}
          onChange={(e) => setShowBySize(e.target.value)}
          className={cn(studioForm.selectTrigger, "h-11 w-full")}
        >
          {FRAME_SHOW_BY_SIZE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {frameAssets.length === 0 ? (
        <StudioPanelHint>No frames available</StudioPanelHint>
      ) : filteredFrames.length === 0 ? (
        <StudioPanelHint>No frames for this size. Try &quot;All&quot; or another option.</StudioPanelHint>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {filteredFrames.map((asset) => (
            <button
              key={asset.url}
              type="button"
              onClick={() => onInsertFrame(asset.url)}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-[10px] border border-white/[0.09] bg-[#0E0D18] transition-all hover:border-[#8069FF] hover:shadow-[0_0_0_1px_#8069FF] active:scale-[0.98]"
              title={asset.display_name}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)",
                  backgroundSize: "10px 10px",
                  backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
                }}
              />
              <Image
                src={asset.url}
                alt={asset.display_name}
                fill
                sizes="(max-width: 400px) 50vw, 200px"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                <p className="truncate text-[10px] font-medium leading-tight text-white">
                  {asset.display_name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

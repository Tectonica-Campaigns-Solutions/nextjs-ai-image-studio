"use client";

import React, { useRef, useEffect, useMemo } from "react";
import type { RgbaColor } from "../types/image-editor-types";
import { rgbaToString } from "../utils/image-editor-utils";

interface EyedropperMagnifierProps {
  /** Viewport X (clientX) */
  x: number;
  /** Viewport Y (clientY) */
  y: number;
  previewColor: RgbaColor;
  pixels: Uint8ClampedArray | null;
  gridSide: number;
}

const MAG_DISPLAY_SIZE = 120;
/** Total approximate height of the magnifier + color chip */
const TOTAL_HEIGHT = 160;
/** Gap between the pointer and the magnifier edge */
const GAP = 20;

export const EyedropperMagnifier = React.memo(function EyedropperMagnifier({
  x,
  y,
  previewColor,
  pixels,
  gridSide,
}: EyedropperMagnifierProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs || !pixels) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const cellSize = Math.floor(MAG_DISPLAY_SIZE / gridSide);
    const totalSize = cellSize * gridSide;
    cvs.width = totalSize;
    cvs.height = totalSize;

    for (let row = 0; row < gridSide; row++) {
      for (let col = 0; col < gridSide; col++) {
        const idx = (row * gridSide + col) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const a = pixels[idx + 3] / 255;
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridSide; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, totalSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(totalSize, i * cellSize);
      ctx.stroke();
    }

    const center = Math.floor(gridSide / 2);
    const cx = center * cellSize;
    const cy = center * cellSize;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx, cy, cellSize, cellSize);
  }, [pixels, gridSide]);

  // Smart positioning: show above the cursor by default,
  // flip below if there's not enough room above.
  const pos = useMemo(() => {
    const halfW = MAG_DISPLAY_SIZE / 2;
    const showAbove = y - TOTAL_HEIGHT - GAP > 0;

    let top: number;
    if (showAbove) {
      top = y - TOTAL_HEIGHT - GAP;
    } else {
      top = y + GAP;
    }

    // Clamp horizontally so it doesn't overflow the viewport
    let left = x - halfW;
    left = Math.max(4, Math.min(left, window.innerWidth - MAG_DISPLAY_SIZE - 4));

    return { left, top };
  }, [x, y]);

  const colorStr = rgbaToString(previewColor);
  const hex = `#${previewColor.r.toString(16).padStart(2, "0")}${previewColor.g.toString(16).padStart(2, "0")}${previewColor.b.toString(16).padStart(2, "0")}`.toUpperCase();

  return (
    <div
      className="pointer-events-none fixed z-[9999]"
      style={{ left: pos.left, top: pos.top }}
    >
      <div
        className="relative overflow-hidden rounded-full border-[3px] border-white/80 shadow-lg"
        style={{ width: MAG_DISPLAY_SIZE, height: MAG_DISPLAY_SIZE }}
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-1.5 rounded-md bg-black/80 px-2 py-1">
        <div
          className="h-4 w-4 shrink-0 rounded-full border border-white/40"
          style={{ backgroundColor: colorStr }}
        />
        <span className="text-[11px] font-medium text-white/90 font-(family-name:--font-manrope) tabular-nums">
          {hex}
        </span>
      </div>
    </div>
  );
});

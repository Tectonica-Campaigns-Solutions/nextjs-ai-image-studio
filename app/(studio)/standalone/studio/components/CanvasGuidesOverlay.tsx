"use client";

import React from "react";
import { GUIDES } from "../constants/editor-constants";

export interface CanvasGuidesOverlayProps {
  width: number;
  height: number;
  showGrid: boolean;
  guidePositions: { v: number[]; h: number[] };
}

export function CanvasGuidesOverlay({
  width,
  height,
  showGrid,
  guidePositions,
}: CanvasGuidesOverlayProps) {
  if (width <= 0 || height <= 0) return null;

  const gridSize = GUIDES.DEFAULT_GRID_SIZE;

  return (
    <div
      className="absolute left-0 top-0 pointer-events-none z-10"
      style={{ width, height }}
      aria-hidden
    >
      <svg width={width} height={height} className="absolute left-0 top-0">
        {showGrid && (
          <g stroke={GUIDES.GRID_COLOR} strokeWidth={GUIDES.GRID_WIDTH}>
            {Array.from({ length: Math.ceil(width / gridSize) + 1 }, (_, i) => (
              <line
                key={`v-${i}`}
                x1={i * gridSize}
                y1={0}
                x2={i * gridSize}
                y2={height}
              />
            ))}
            {Array.from({ length: Math.ceil(height / gridSize) + 1 }, (_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={i * gridSize}
                x2={width}
                y2={i * gridSize}
              />
            ))}
          </g>
        )}
        <g stroke={GUIDES.GUIDE_COLOR} strokeWidth={GUIDES.GUIDE_WIDTH}>
          {guidePositions.v.map((x, i) => (
            <line key={`gv-${i}`} x1={x} y1={0} x2={x} y2={height} />
          ))}
          {guidePositions.h.map((y, i) => (
            <line key={`gh-${i}`} x1={0} y1={y} x2={width} y2={y} />
          ))}
        </g>
      </svg>
    </div>
  );
}

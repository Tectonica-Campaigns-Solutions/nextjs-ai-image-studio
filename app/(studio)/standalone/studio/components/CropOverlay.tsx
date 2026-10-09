"use client";

import { useRef } from "react";
import { MIN_CROP_SIZE, type CropBox } from "../lib/crop";

type DragMode = "move" | "nw" | "ne" | "sw" | "se";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const HANDLES: { mode: Exclude<DragMode, "move">; className: string; cursor: string }[] = [
  { mode: "nw", className: "-left-1.5 -top-1.5", cursor: "nwse-resize" },
  { mode: "ne", className: "-right-1.5 -top-1.5", cursor: "nesw-resize" },
  { mode: "sw", className: "-left-1.5 -bottom-1.5", cursor: "nesw-resize" },
  { mode: "se", className: "-right-1.5 -bottom-1.5", cursor: "nwse-resize" },
];

/**
 * Crop box drawn over the canvas (HTML, not a fabric object, so it never ends
 * up in history or exports). Covers the canvas while cropping.
 */
export function CropOverlay({
  width,
  height,
  box,
  ratio,
  onChange,
}: {
  width: number;
  height: number;
  box: CropBox;
  /** Locked width/height ratio, or null for free cropping. */
  ratio: number | null;
  onChange: (box: CropBox) => void;
}) {
  const dragRef = useRef<{ mode: DragMode; px: number; py: number; start: CropBox } | null>(null);

  const onPointerDown = (e: React.PointerEvent, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode, px: e.clientX, py: e.clientY, start: box };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.px;
    const dy = e.clientY - drag.py;
    const s = drag.start;

    if (drag.mode === "move") {
      onChange({ ...s, x: clamp(s.x + dx, 0, width - s.w), y: clamp(s.y + dy, 0, height - s.h) });
      return;
    }

    const hx = drag.mode.includes("e") ? 1 : -1;
    const vy = drag.mode.includes("s") ? 1 : -1;
    const maxW = hx > 0 ? width - s.x : s.x + s.w;
    const maxH = vy > 0 ? height - s.y : s.y + s.h;
    let w = clamp(s.w + hx * dx, MIN_CROP_SIZE, maxW);
    let h = ratio ? w / ratio : clamp(s.h + vy * dy, MIN_CROP_SIZE, maxH);
    if (ratio && h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    onChange({
      x: hx > 0 ? s.x : s.x + s.w - w,
      y: vy > 0 ? s.y : s.y + s.h - h,
      w,
      h,
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  if (width <= 0 || height <= 0) return null;

  return (
    <div
      className="absolute left-0 top-0 z-[4] overflow-hidden touch-none"
      style={{ width, height }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        role="presentation"
        className="absolute cursor-move border-2 border-white"
        style={{
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          boxShadow: "0 0 0 9999px rgba(10, 8, 18, 0.6)",
        }}
        onPointerDown={(e) => onPointerDown(e, "move")}
      >
        {/* Rule-of-thirds guides */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
          <div className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white/40" />
        </div>
        {HANDLES.map((h) => (
          <div
            key={h.mode}
            aria-label={`Resize crop (${h.mode})`}
            className={`absolute size-3.5 rounded-[3px] border-2 border-[#6146F2] bg-white ${h.className}`}
            style={{ cursor: h.cursor }}
            onPointerDown={(e) => onPointerDown(e, h.mode)}
          />
        ))}
      </div>
    </div>
  );
}

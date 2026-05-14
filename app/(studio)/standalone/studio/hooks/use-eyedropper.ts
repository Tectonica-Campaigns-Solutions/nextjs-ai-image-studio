"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { RgbaColor } from "../types/image-editor-types";

export type EyedropperTarget = "textColor" | "backgroundColor" | "shapeFill" | "shapeStroke" | null;

export interface EyedropperState {
  previewColor: RgbaColor | null;
  /** Viewport-relative position (clientX/clientY) for fixed-position magnifier */
  magnifierPos: { x: number; y: number } | null;
  magnifierPixels: Uint8ClampedArray | null;
}

export interface UseEyedropperOptions {
  canvasRef: React.MutableRefObject<any>;
  onPickColor: (color: RgbaColor, target: EyedropperTarget) => void;
}

const MAG_RADIUS = 6;
const MAG_SIDE = MAG_RADIUS * 2 + 1;

function hasNativeEyeDropper(): boolean {
  return typeof window !== "undefined" && "EyeDropper" in window;
}

function hexToRgba(hex: string): RgbaColor {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
    a: 1,
  };
}

export function useEyedropper({ canvasRef, onPickColor }: UseEyedropperOptions) {
  const [activeTarget, setActiveTarget] = useState<EyedropperTarget>(null);
  const [eyedropperState, setEyedropperState] = useState<EyedropperState>({
    previewColor: null,
    magnifierPos: null,
    magnifierPixels: null,
  });

  const activeTargetRef = useRef<EyedropperTarget>(null);
  activeTargetRef.current = activeTarget;

  const onPickColorRef = useRef(onPickColor);
  onPickColorRef.current = onPickColor;

  // Track the native EyeDropper AbortController so we can cancel on Escape/unmount
  const nativeAbortRef = useRef<AbortController | null>(null);

  const startEyedropper = useCallback((target: EyedropperTarget) => {
    // Try the native EyeDropper API first (Chrome/Edge)
    if (hasNativeEyeDropper()) {
      const abort = new AbortController();
      nativeAbortRef.current = abort;
      const dropper = new (window as any).EyeDropper();
      dropper
        .open({ signal: abort.signal })
        .then((result: { sRGBHex: string }) => {
          const color = hexToRgba(result.sRGBHex);
          onPickColorRef.current(color, target);
        })
        .catch(() => {
          // User cancelled (Escape) or aborted — do nothing
        })
        .finally(() => {
          nativeAbortRef.current = null;
        });
      return;
    }

    // Fallback: canvas-based eyedropper
    setActiveTarget(target);
    setEyedropperState({ previewColor: null, magnifierPos: null, magnifierPixels: null });
  }, []);

  const cancelEyedropper = useCallback(() => {
    nativeAbortRef.current?.abort();
    nativeAbortRef.current = null;
    setActiveTarget(null);
    setEyedropperState({ previewColor: null, magnifierPos: null, magnifierPixels: null });
  }, []);

  /** Read pixel data at a point. Called at most once per animation frame. */
  const readPixel = useCallback(
    (clientX: number, clientY: number): { color: RgbaColor; canvasX: number; canvasY: number; pixels: Uint8ClampedArray | null } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const el: HTMLCanvasElement | undefined =
        canvas.lowerCanvasEl ?? canvas.getElement?.();
      if (!el) return null;

      const rect = el.getBoundingClientRect();
      const scaleX = el.width / rect.width;
      const scaleY = el.height / rect.height;
      const x = Math.round((clientX - rect.left) * scaleX);
      const y = Math.round((clientY - rect.top) * scaleY);

      if (x < 0 || y < 0 || x >= el.width || y >= el.height) return null;

      try {
        const ctx = el.getContext("2d");
        if (!ctx) return null;

        // Single pixel
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const color: RgbaColor = {
          r: pixel[0],
          g: pixel[1],
          b: pixel[2],
          a: Math.round((pixel[3] / 255) * 100) / 100,
        };

        // Magnifier grid
        let pixels: Uint8ClampedArray | null = null;
        const sx = x - MAG_RADIUS;
        const sy = y - MAG_RADIUS;
        try {
          const validX = Math.max(0, sx);
          const validY = Math.max(0, sy);
          const validW = Math.min(el.width, sx + MAG_SIDE) - validX;
          const validH = Math.min(el.height, sy + MAG_SIDE) - validY;
          if (validW > 0 && validH > 0) {
            const imgData = ctx.getImageData(validX, validY, validW, validH);
            pixels = new Uint8ClampedArray(MAG_SIDE * MAG_SIDE * 4);
            const offsetX = validX - sx;
            const offsetY = validY - sy;
            for (let row = 0; row < validH; row++) {
              const srcStart = row * validW * 4;
              const dstStart = ((row + offsetY) * MAG_SIDE + offsetX) * 4;
              pixels.set(imgData.data.subarray(srcStart, srcStart + validW * 4), dstStart);
            }
          }
        } catch {
          // non-critical
        }

        return { color, viewportX: clientX, viewportY: clientY, pixels };
      } catch {
        return null;
      }
    },
    [canvasRef],
  );

  useEffect(() => {
    if (!activeTarget) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const el: HTMLCanvasElement | undefined =
      canvas.lowerCanvasEl ?? canvas.getElement?.();
    const upperEl: HTMLCanvasElement | undefined =
      canvas.upperCanvasEl ?? canvas.wrapperEl?.querySelector("canvas.upper-canvas");
    const target = upperEl ?? el;
    if (!target) return;

    const prevSkipTargetFind = canvas.skipTargetFind;
    const prevSelection = canvas.selection;
    canvas.skipTargetFind = true;
    canvas.selection = false;

    const wrapper = target.parentElement;

    // --- Throttle pointermove to 1 read per animation frame ---
    let rafId = 0;
    let pendingClientX = 0;
    let pendingClientY = 0;

    const flushMove = () => {
      rafId = 0;
      const result = readPixel(pendingClientX, pendingClientY);
      if (result) {
        setEyedropperState({
          previewColor: result.color,
          magnifierPos: { x: result.viewportX, y: result.viewportY },
          magnifierPixels: result.pixels,
        });
      }
    };

    const handleMove = (e: PointerEvent | TouchEvent) => {
      e.preventDefault();
      const pt = "touches" in e ? e.touches[0] : e;
      if (!pt) return;
      pendingClientX = pt.clientX;
      pendingClientY = pt.clientY;
      if (!rafId) {
        rafId = requestAnimationFrame(flushMove);
      }
    };

    const handleDown = (e: PointerEvent | TouchEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();

      const pt = "touches" in e ? e.touches[0] : e;
      if (!pt) return;
      const result = readPixel(pt.clientX, pt.clientY);

      if (result && activeTargetRef.current) {
        onPickColorRef.current(result.color, activeTargetRef.current);
      }
      setActiveTarget(null);
      setEyedropperState({ previewColor: null, magnifierPos: null, magnifierPixels: null });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveTarget(null);
        setEyedropperState({ previewColor: null, magnifierPos: null, magnifierPixels: null });
      }
    };

    const prevCursorUpper = target.style.cursor;
    const prevCursorWrapper = wrapper?.style.cursor ?? "";
    target.style.cursor = "crosshair";
    if (wrapper) wrapper.style.cursor = "crosshair";

    target.addEventListener("pointermove", handleMove, { passive: false });
    target.addEventListener("touchmove", handleMove, { passive: false });
    target.addEventListener("pointerdown", handleDown, { passive: false, capture: true });
    target.addEventListener("touchstart", handleDown, { passive: false, capture: true });
    document.addEventListener("keydown", handleKeyDown);

    const prevTouchAction = target.style.touchAction;
    target.style.touchAction = "none";

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      target.removeEventListener("pointermove", handleMove);
      target.removeEventListener("touchmove", handleMove);
      target.removeEventListener("pointerdown", handleDown, { capture: true });
      target.removeEventListener("touchstart", handleDown, { capture: true });
      document.removeEventListener("keydown", handleKeyDown);
      target.style.cursor = prevCursorUpper;
      target.style.touchAction = prevTouchAction;
      if (wrapper) wrapper.style.cursor = prevCursorWrapper;
      canvas.skipTargetFind = prevSkipTargetFind;
      canvas.selection = prevSelection;
    };
  }, [activeTarget, canvasRef, readPixel]);

  return {
    activeTarget,
    eyedropperState,
    startEyedropper,
    cancelEyedropper,
    magnifierSide: MAG_SIDE,
  };
}

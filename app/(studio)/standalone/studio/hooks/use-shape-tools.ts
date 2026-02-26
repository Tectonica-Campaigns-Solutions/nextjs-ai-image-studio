"use client";

import { useState, useCallback } from "react";
import { Rect } from "fabric";
import { rgbaToString } from "../utils/image-editor-utils";
import type { RgbaColor } from "../types/image-editor-types";
import { SHAPE_DEFAULTS } from "../constants/editor-constants";

export interface UseShapeToolsOptions {
  canvasRef: React.MutableRefObject<any>;
  saveStateRef: React.MutableRefObject<(immediate?: boolean) => void>;
}

export function useShapeTools(options: UseShapeToolsOptions) {
  const { canvasRef, saveStateRef } = options;

  const [rectFillColor, setRectFillColor] = useState<RgbaColor>(
    SHAPE_DEFAULTS.FILL_COLOR
  );
  const [rectStrokeColor, setRectStrokeColor] = useState<RgbaColor>(
    SHAPE_DEFAULTS.STROKE_COLOR
  );
  const [rectStrokeWidth, setRectStrokeWidth] = useState<number>(
    SHAPE_DEFAULTS.STROKE_WIDTH
  );
  const [rectOpacity, setRectOpacity] = useState<number>(
    SHAPE_DEFAULTS.FILL_OPACITY
  );

  const isRectSelected = (obj: any) =>
    obj && obj.type === "rect" && (obj as any).isRect === true;

  const addRect = useCallback(() => {
    const canvas = canvasRef.current;
    const saveState = saveStateRef.current;
    if (!canvas) return;

    const rect = new Rect({
      left: canvas.width! / 2 - SHAPE_DEFAULTS.WIDTH / 2,
      top: canvas.height! / 2 - SHAPE_DEFAULTS.HEIGHT / 2,
      width: SHAPE_DEFAULTS.WIDTH,
      height: SHAPE_DEFAULTS.HEIGHT,
      fill: rgbaToString(rectFillColor),
      stroke: rgbaToString(rectStrokeColor),
      strokeWidth: rectStrokeWidth,
      opacity: rectOpacity / 100,
      selectable: true,
      evented: true,
    });

    (rect as any).isRect = true;
    (rect as any).isEditable = true;

    canvas.add(rect);
    // Place rect just above the background image (index 0), below all other overlays
    canvas.moveObjectTo(rect, 1);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    saveState(true);
  }, [
    canvasRef,
    saveStateRef,
    rectFillColor,
    rectStrokeColor,
    rectStrokeWidth,
    rectOpacity,
  ]);

  const updateSelectedRect = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || !isRectSelected(active)) return;

    active.set({
      fill: rgbaToString(rectFillColor),
      stroke: rgbaToString(rectStrokeColor),
      strokeWidth: rectStrokeWidth,
      opacity: rectOpacity / 100,
    });

    canvas.renderAll();
  }, [
    canvasRef,
    rectFillColor,
    rectStrokeColor,
    rectStrokeWidth,
    rectOpacity,
  ]);

  return {
    rectFillColor,
    setRectFillColor,
    rectStrokeColor,
    setRectStrokeColor,
    rectStrokeWidth,
    setRectStrokeWidth,
    rectOpacity,
    setRectOpacity,
    isRectSelected,
    addRect,
    updateSelectedRect,
  };
}

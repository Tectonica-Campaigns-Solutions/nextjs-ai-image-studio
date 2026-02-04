"use client";

import { useState, useCallback } from "react";
import { SnappyRect } from "../utils/fabric-snappy-rect";
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
  const [snapEnabled, setSnapEnabled] = useState<boolean>(
    SHAPE_DEFAULTS.SNAP_ENABLED
  );
  const [snapThreshold, setSnapThreshold] = useState<number>(
    SHAPE_DEFAULTS.SNAP_THRESHOLD
  );

  const isRectSelected = (obj: any) =>
    obj &&
    (obj.type === "rect" ||
      obj.type === "snappy-rect" ||
      (obj as any).snapEnabled !== undefined);

  const addSnappyRect = useCallback(() => {
    const canvas = canvasRef.current;
    const saveState = saveStateRef.current;
    if (!canvas) return;

    const rect = new SnappyRect({
      left: canvas.width! / 2 - SHAPE_DEFAULTS.WIDTH / 2,
      top: canvas.height! / 2 - SHAPE_DEFAULTS.HEIGHT / 2,
      width: SHAPE_DEFAULTS.WIDTH,
      height: SHAPE_DEFAULTS.HEIGHT,
      fill: rgbaToString(rectFillColor),
      stroke: rgbaToString(rectStrokeColor),
      strokeWidth: rectStrokeWidth,
      selectable: true,
      evented: true,
      snapEnabled,
      snapThreshold,
    });

    rect._setCanvas(canvas);
    (rect as any).isEditable = true;

    canvas.add(rect as any);
    canvas.setActiveObject(rect as any);
    canvas.renderAll();
    saveState(true);
  }, [
    canvasRef,
    saveStateRef,
    rectFillColor,
    rectStrokeColor,
    rectStrokeWidth,
    snapEnabled,
    snapThreshold,
  ]);

  const updateSelectedRect = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || !isRectSelected(active)) return;

    const isSnappyRect =
      active.type === "snappy-rect" ||
      (active as any).snapEnabled !== undefined;

    const rectObj = active as unknown as SnappyRect;
    rectObj.set({
      fill: rgbaToString(rectFillColor),
      stroke: rgbaToString(rectStrokeColor),
      strokeWidth: rectStrokeWidth,
    });

    if (isSnappyRect) {
      rectObj.snapEnabled = snapEnabled;
      rectObj.snapThreshold = snapThreshold;
    }

    canvas.renderAll();
  }, [
    canvasRef,
    rectFillColor,
    rectStrokeColor,
    rectStrokeWidth,
    snapEnabled,
    snapThreshold,
  ]);

  return {
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
    isRectSelected,
    addSnappyRect,
    updateSelectedRect,
  };
}

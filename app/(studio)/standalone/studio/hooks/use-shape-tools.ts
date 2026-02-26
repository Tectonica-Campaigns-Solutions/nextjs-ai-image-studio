"use client";

import { useState, useCallback } from "react";
import { Rect, Circle, Triangle, Path } from "fabric";
import { rgbaToString } from "../utils/image-editor-utils";
import type { RgbaColor, ShapeType } from "../types/image-editor-types";
import { SHAPE_DEFAULTS } from "../constants/editor-constants";

export interface UseShapeToolsOptions {
  canvasRef: React.MutableRefObject<any>;
  saveStateRef: React.MutableRefObject<(immediate?: boolean) => void>;
}

function starPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points = 5
): string {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    d +=
      (i === 0 ? "M" : "L") +
      (cx + r * Math.cos(angle)) +
      "," +
      (cy + r * Math.sin(angle));
  }
  return d + "Z";
}

function hexagonPath(cx: number, cy: number, r: number): string {
  let d = "";
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    d += (i === 0 ? "M" : "L") + (cx + r * Math.cos(angle)) + "," + (cy + r * Math.sin(angle));
  }
  return d + "Z";
}

function arrowPath(w: number, h: number): string {
  const shaftH = h * 0.35;
  const shaftTop = (h - shaftH) / 2;
  const shaftBottom = shaftTop + shaftH;
  const arrowX = w * 0.6;
  return [
    `M 0 ${shaftTop}`,
    `L ${arrowX} ${shaftTop}`,
    `L ${arrowX} 0`,
    `L ${w} ${h / 2}`,
    `L ${arrowX} ${h}`,
    `L ${arrowX} ${shaftBottom}`,
    `L 0 ${shaftBottom}`,
    "Z",
  ].join(" ");
}

function crossPath(w: number, h: number): string {
  const t = w * 0.3;
  const cx = w / 2;
  const cy = h / 2;
  return [
    `M ${cx - t / 2} 0`,
    `L ${cx + t / 2} 0`,
    `L ${cx + t / 2} ${cy - t / 2}`,
    `L ${w} ${cy - t / 2}`,
    `L ${w} ${cy + t / 2}`,
    `L ${cx + t / 2} ${cy + t / 2}`,
    `L ${cx + t / 2} ${h}`,
    `L ${cx - t / 2} ${h}`,
    `L ${cx - t / 2} ${cy + t / 2}`,
    `L 0 ${cy + t / 2}`,
    `L 0 ${cy - t / 2}`,
    `L ${cx - t / 2} ${cy - t / 2}`,
    "Z",
  ].join(" ");
}

function buildFabricShape(
  type: ShapeType,
  fill: string,
  stroke: string,
  strokeWidth: number,
  opacity: number,
  canvasWidth: number,
  canvasHeight: number
): any {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const w = SHAPE_DEFAULTS.WIDTH;
  const h = SHAPE_DEFAULTS.HEIGHT;
  const r = SHAPE_DEFAULTS.RADIUS;

  const baseProps = {
    fill,
    stroke,
    strokeWidth,
    opacity: opacity / 100,
    selectable: true,
    evented: true,
  };

  switch (type) {
    case "rectangle":
      return new Rect({
        ...baseProps,
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
      });

    case "square":
      return new Rect({
        ...baseProps,
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
      });

    case "rounded-rectangle":
      return new Rect({
        ...baseProps,
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        rx: 20,
        ry: 20,
      });

    case "circle":
      return new Circle({
        ...baseProps,
        left: cx - r,
        top: cy - r,
        radius: r,
      });

    case "half-circle-right": {
      const path = new Path(`M 0 ${r} A ${r} ${r} 0 0 1 0 ${-r} Z`, {
        ...baseProps,
        left: cx - r / 2,
        top: cy - r,
      });
      return path;
    }

    case "half-circle-left": {
      const path = new Path(`M 0 ${r} A ${r} ${r} 0 0 0 0 ${-r} Z`, {
        ...baseProps,
        left: cx - r / 2,
        top: cy - r,
      });
      return path;
    }

    case "triangle":
      return new Triangle({
        ...baseProps,
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
      });

    case "star": {
      const outerR = SHAPE_DEFAULTS.STAR_OUTER_RADIUS;
      const innerR = SHAPE_DEFAULTS.STAR_INNER_RADIUS;
      const d = starPath(outerR, outerR, outerR, innerR);
      return new Path(d, {
        ...baseProps,
        left: cx - outerR,
        top: cy - outerR,
      });
    }

    case "arrow": {
      const d = arrowPath(w, h);
      return new Path(d, {
        ...baseProps,
        left: cx - w / 2,
        top: cy - h / 2,
      });
    }

    case "diamond": {
      const d = `M ${r} 0 L ${r * 2} ${r} L ${r} ${r * 2} L 0 ${r} Z`;
      return new Path(d, {
        ...baseProps,
        left: cx - r,
        top: cy - r,
      });
    }

    case "hexagon": {
      const d = hexagonPath(r, r, r);
      return new Path(d, {
        ...baseProps,
        left: cx - r,
        top: cy - r,
      });
    }

    case "cross": {
      const d = crossPath(w, h);
      return new Path(d, {
        ...baseProps,
        left: cx - w / 2,
        top: cy - h / 2,
      });
    }

    default:
      return new Rect({
        ...baseProps,
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
      });
  }
}

export function useShapeTools(options: UseShapeToolsOptions) {
  const { canvasRef, saveStateRef } = options;

  const [shapeFillColor, setShapeFillColor] = useState<RgbaColor>(
    SHAPE_DEFAULTS.FILL_COLOR
  );
  const [shapeStrokeColor, setShapeStrokeColor] = useState<RgbaColor>(
    SHAPE_DEFAULTS.STROKE_COLOR
  );
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState<number>(
    SHAPE_DEFAULTS.STROKE_WIDTH
  );
  const [shapeOpacity, setShapeOpacity] = useState<number>(
    SHAPE_DEFAULTS.FILL_OPACITY
  );

  const isShapeSelected = (obj: any): boolean =>
    obj && (obj as any).isShape === true;

  const addShape = useCallback(
    (type: ShapeType) => {
      const canvas = canvasRef.current;
      const saveState = saveStateRef.current;
      if (!canvas) return;

      const shape = buildFabricShape(
        type,
        rgbaToString(shapeFillColor),
        rgbaToString(shapeStrokeColor),
        shapeStrokeWidth,
        shapeOpacity,
        canvas.width!,
        canvas.height!
      );

      (shape as any).isShape = true;
      (shape as any).shapeType = type;
      (shape as any).isEditable = true;

      canvas.add(shape);
      canvas.moveObjectTo(shape, 1);
      canvas.setActiveObject(shape);
      canvas.renderAll();
      saveState(true);
    },
    [
      canvasRef,
      saveStateRef,
      shapeFillColor,
      shapeStrokeColor,
      shapeStrokeWidth,
      shapeOpacity,
    ]
  );

  const updateSelectedShape = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || !isShapeSelected(active)) return;

    active.set({
      fill: rgbaToString(shapeFillColor),
      stroke: rgbaToString(shapeStrokeColor),
      strokeWidth: shapeStrokeWidth,
      opacity: shapeOpacity / 100,
    });

    canvas.renderAll();
  }, [canvasRef, shapeFillColor, shapeStrokeColor, shapeStrokeWidth, shapeOpacity]);

  return {
    shapeFillColor,
    setShapeFillColor,
    shapeStrokeColor,
    setShapeStrokeColor,
    shapeStrokeWidth,
    setShapeStrokeWidth,
    shapeOpacity,
    setShapeOpacity,
    isShapeSelected,
    addShape,
    updateSelectedShape,
  };
}

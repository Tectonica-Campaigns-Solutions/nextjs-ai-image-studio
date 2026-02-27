"use client";

import { useState, useEffect, useRef } from "react";
import type { IText } from "fabric";
import type { ObjectMetadata, RgbaColor } from "../types/image-editor-types";

export interface UseImageEditorSelectionOptions {
  canvasRef: React.MutableRefObject<any>;
  setFontSize: (n: number) => void;
  setFontFamily: (s: string) => void;
  setTextColor: (c: RgbaColor) => void;
  setBackgroundColor: (c: RgbaColor) => void;
  setIsBold: (b: boolean) => void;
  setIsItalic: (b: boolean) => void;
  setIsUnderline: (b: boolean) => void;
  setLineHeight: (n: number) => void;
  setLetterSpacing: (n: number) => void;
  setShapeFillColor: (c: RgbaColor) => void;
  setShapeStrokeColor: (c: RgbaColor) => void;
  setShapeStrokeWidth: (n: number) => void;
  setShapeOpacity: (n: number) => void;
  onShapeSyncStart?: () => void;
  onShapeSyncEnd?: () => void;
}

export function useImageEditorSelection(
  options: UseImageEditorSelectionOptions
) {
  const {
    canvasRef,
    setFontSize,
    setFontFamily,
    setTextColor,
    setBackgroundColor,
    setIsBold,
    setIsItalic,
    setIsUnderline,
    setLineHeight,
    setLetterSpacing,
    setShapeFillColor,
    setShapeStrokeColor,
    setShapeStrokeWidth,
    setShapeOpacity,
    onShapeSyncStart,
    onShapeSyncEnd,
  } = options;

  // Keep setter refs always up-to-date so late-wired real setters are always called
  const setShapeFillColorRef = useRef(setShapeFillColor);
  const setShapeStrokeColorRef = useRef(setShapeStrokeColor);
  const setShapeStrokeWidthRef = useRef(setShapeStrokeWidth);
  const setShapeOpacityRef = useRef(setShapeOpacity);
  const onShapeSyncStartRef = useRef(onShapeSyncStart);
  const onShapeSyncEndRef = useRef(onShapeSyncEnd);

  useEffect(() => { setShapeFillColorRef.current = setShapeFillColor; }, [setShapeFillColor]);
  useEffect(() => { setShapeStrokeColorRef.current = setShapeStrokeColor; }, [setShapeStrokeColor]);
  useEffect(() => { setShapeStrokeWidthRef.current = setShapeStrokeWidth; }, [setShapeStrokeWidth]);
  useEffect(() => { setShapeOpacityRef.current = setShapeOpacity; }, [setShapeOpacity]);
  useEffect(() => { onShapeSyncStartRef.current = onShapeSyncStart; }, [onShapeSyncStart]);
  useEffect(() => { onShapeSyncEndRef.current = onShapeSyncEnd; }, [onShapeSyncEnd]);

  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [objectMetadata, setObjectMetadata] = useState<
    Record<number, ObjectMetadata>
  >({});

  // Sync text UI from selected text object
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedObject || selectedObject.type !== "i-text") return;

    const textObj = selectedObject as IText;
    setFontSize(textObj.fontSize || 24);
    setFontFamily(textObj.fontFamily || "Arial");

    const fillColor = textObj.fill as string;
    if (fillColor && fillColor.startsWith("rgba")) {
      const match = fillColor.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/
      );
      if (match) {
        setTextColor({
          r: Number.parseInt(match[1]),
          g: Number.parseInt(match[2]),
          b: Number.parseInt(match[3]),
          a: match[4] ? Number.parseFloat(match[4]) : 1,
        });
      }
    }

    const bgColor = textObj.backgroundColor as string;
    if (bgColor && bgColor.startsWith("rgba")) {
      const match = bgColor.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/
      );
      if (match) {
        setBackgroundColor({
          r: Number.parseInt(match[1]),
          g: Number.parseInt(match[2]),
          b: Number.parseInt(match[3]),
          a: match[4] ? Number.parseFloat(match[4]) : 1,
        });
      }
    } else {
      setBackgroundColor({ r: 255, g: 255, b: 255, a: 0 });
    }

    setIsBold(textObj.fontWeight === "bold");
    setIsItalic(textObj.fontStyle === "italic");
    setIsUnderline(textObj.underline || false);
    setLineHeight(textObj.lineHeight || 1.2);
    setLetterSpacing(textObj.charSpacing || 0);
  }, [
    selectedObject,
    canvasRef,
    setFontSize,
    setFontFamily,
    setTextColor,
    setBackgroundColor,
    setIsBold,
    setIsItalic,
    setIsUnderline,
    setLineHeight,
    setLetterSpacing,
  ]);

  // Sync shape UI from selected shape object
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedObject) return;

    if (!(selectedObject as any).isShape) return;

    const shapeObj = selectedObject as any;

    // Signal that the following state changes are from a selection sync,
    // not from user interaction — so the updateSelectedShape effect should skip.
    onShapeSyncStartRef.current?.();

    const fillColor = shapeObj.fill as string;
    if (fillColor && fillColor.startsWith("rgba")) {
      const match = fillColor.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/
      );
      if (match) {
        setShapeFillColorRef.current({
          r: Number.parseInt(match[1]),
          g: Number.parseInt(match[2]),
          b: Number.parseInt(match[3]),
          a: match[4] ? Number.parseFloat(match[4]) : 1,
        });
      }
    }

    const strokeColor = shapeObj.stroke as string;
    if (strokeColor && strokeColor.startsWith("rgba")) {
      const match = strokeColor.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/
      );
      if (match) {
        setShapeStrokeColorRef.current({
          r: Number.parseInt(match[1]),
          g: Number.parseInt(match[2]),
          b: Number.parseInt(match[3]),
          a: match[4] ? Number.parseFloat(match[4]) : 1,
        });
      }
    }

    setShapeStrokeWidthRef.current(shapeObj.strokeWidth ?? 2);

    const opacity = typeof shapeObj.opacity === "number" ? shapeObj.opacity : 1;
    setShapeOpacityRef.current(Math.round(opacity * 100));

    // Signal sync complete — the effect in standalone will check this flag
    // after the current render cycle via a microtask
    Promise.resolve().then(() => onShapeSyncEndRef.current?.());
  }, [selectedObject, canvasRef]);

  return {
    selectedObject,
    setSelectedObject,
    objectMetadata,
    setObjectMetadata,
  };
}

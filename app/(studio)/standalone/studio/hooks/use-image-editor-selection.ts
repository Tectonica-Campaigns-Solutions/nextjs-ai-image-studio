"use client";

import { useState, useEffect } from "react";
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
  setRectFillColor: (c: RgbaColor) => void;
  setRectStrokeColor: (c: RgbaColor) => void;
  setRectStrokeWidth: (n: number) => void;
  setRectOpacity: (n: number) => void;
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
    setRectFillColor,
    setRectStrokeColor,
    setRectStrokeWidth,
    setRectOpacity,
  } = options;

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

  // Sync rect UI from selected rect object
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedObject) return;

    const isRectSelected =
      selectedObject.type === "rect" && (selectedObject as any).isRect === true;

    if (!isRectSelected) return;

    const rectObj = selectedObject as any;

    const fillColor = rectObj.fill as string;
    if (fillColor && fillColor.startsWith("rgba")) {
      const match = fillColor.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/
      );
      if (match) {
        setRectFillColor({
          r: Number.parseInt(match[1]),
          g: Number.parseInt(match[2]),
          b: Number.parseInt(match[3]),
          a: match[4] ? Number.parseFloat(match[4]) : 1,
        });
      }
    }

    const strokeColor = rectObj.stroke as string;
    if (strokeColor && strokeColor.startsWith("rgba")) {
      const match = strokeColor.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/
      );
      if (match) {
        setRectStrokeColor({
          r: Number.parseInt(match[1]),
          g: Number.parseInt(match[2]),
          b: Number.parseInt(match[3]),
          a: match[4] ? Number.parseFloat(match[4]) : 1,
        });
      }
    }

    setRectStrokeWidth(rectObj.strokeWidth || 2);

    const opacity = typeof rectObj.opacity === "number" ? rectObj.opacity : 1;
    setRectOpacity(Math.round(opacity * 100));
  }, [
    selectedObject,
    canvasRef,
    setRectFillColor,
    setRectStrokeColor,
    setRectStrokeWidth,
    setRectOpacity,
  ]);

  return {
    selectedObject,
    setSelectedObject,
    objectMetadata,
    setObjectMetadata,
  };
}

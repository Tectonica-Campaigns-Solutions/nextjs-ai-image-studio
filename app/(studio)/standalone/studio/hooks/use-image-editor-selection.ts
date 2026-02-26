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
  setShapeFillColor: (c: RgbaColor) => void;
  setShapeStrokeColor: (c: RgbaColor) => void;
  setShapeStrokeWidth: (n: number) => void;
  setShapeOpacity: (n: number) => void;
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

  // Sync shape UI from selected shape object
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedObject) return;

    if (!(selectedObject as any).isShape) return;

    const shapeObj = selectedObject as any;

    const fillColor = shapeObj.fill as string;
    if (fillColor && fillColor.startsWith("rgba")) {
      const match = fillColor.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/
      );
      if (match) {
        setShapeFillColor({
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
        setShapeStrokeColor({
          r: Number.parseInt(match[1]),
          g: Number.parseInt(match[2]),
          b: Number.parseInt(match[3]),
          a: match[4] ? Number.parseFloat(match[4]) : 1,
        });
      }
    }

    setShapeStrokeWidth(shapeObj.strokeWidth || 2);

    const opacity = typeof shapeObj.opacity === "number" ? shapeObj.opacity : 1;
    setShapeOpacity(Math.round(opacity * 100));
  }, [
    selectedObject,
    canvasRef,
    setShapeFillColor,
    setShapeStrokeColor,
    setShapeStrokeWidth,
    setShapeOpacity,
  ]);

  return {
    selectedObject,
    setSelectedObject,
    objectMetadata,
    setObjectMetadata,
  };
}

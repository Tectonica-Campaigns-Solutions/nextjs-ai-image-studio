"use client";

import { useState, useCallback } from "react";
import { IText } from "fabric";
import { rgbaToString } from "../utils/image-editor-utils";
import type { RgbaColor } from "../types/image-editor-types";
import { TEXT_DEFAULTS, DEFAULT_FONTS } from "../constants/editor-constants";

export interface UseTextToolsOptions {
  canvasRef: React.MutableRefObject<any>;
  saveStateRef: React.MutableRefObject<(immediate?: boolean) => void>;
  defaultFontFamily?: string;
}

export function useTextTools(options: UseTextToolsOptions) {
  const {
    canvasRef,
    saveStateRef,
    defaultFontFamily = DEFAULT_FONTS.PRIMARY,
  } = options;

  // Get current values from refs
  const canvas = canvasRef.current;
  const saveState = saveStateRef.current;

  const [fontSize, setFontSize] = useState<number>(TEXT_DEFAULTS.FONT_SIZE);
  const [fontFamily, setFontFamily] = useState(defaultFontFamily);
  const [textColor, setTextColor] = useState<RgbaColor>(TEXT_DEFAULTS.COLOR);
  const [backgroundColor, setBackgroundColor] = useState<RgbaColor>(
    TEXT_DEFAULTS.BG_COLOR
  );
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [lineHeight, setLineHeight] = useState<number>(
    TEXT_DEFAULTS.LINE_HEIGHT
  );
  const [letterSpacing, setLetterSpacing] = useState<number>(
    TEXT_DEFAULTS.LETTER_SPACING
  );

  const addText = useCallback(() => {
    const canvas = canvasRef.current;
    const saveState = saveStateRef.current;
    if (!canvas) return;

    const text = new IText(TEXT_DEFAULTS.DEFAULT_TEXT, {
      left: TEXT_DEFAULTS.INITIAL_LEFT,
      top: TEXT_DEFAULTS.INITIAL_TOP,
      fontSize,
      fontFamily,
      fill: rgbaToString(textColor),
      backgroundColor:
        backgroundColor.a === 0 ? "" : rgbaToString(backgroundColor),
      fontWeight: isBold ? "bold" : "normal",
      fontStyle: isItalic ? "italic" : "normal",
      underline: isUnderline,
      lineHeight,
      charSpacing: letterSpacing,
      editable: true,
      selectable: true,
    });
    (text as any).isEditable = true;
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    saveState(true);
  }, [
    canvasRef,
    saveStateRef,
    fontSize,
    fontFamily,
    textColor,
    backgroundColor,
    isBold,
    isItalic,
    isUnderline,
    lineHeight,
    letterSpacing,
  ]);

  const updateSelectedText = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.type !== "i-text") return;

    const textObj = active as IText;
    textObj.set({
      fontSize,
      fontFamily,
      fill: rgbaToString(textColor),
      backgroundColor:
        backgroundColor.a === 0 ? "" : rgbaToString(backgroundColor),
      fontWeight: isBold ? "bold" : "normal",
      fontStyle: isItalic ? "italic" : "normal",
      underline: isUnderline,
      lineHeight,
      charSpacing: letterSpacing,
    });
    canvas.renderAll();
  }, [
    canvasRef,
    fontSize,
    fontFamily,
    textColor,
    backgroundColor,
    isBold,
    isItalic,
    isUnderline,
    lineHeight,
    letterSpacing,
  ]);

  return {
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    textColor,
    setTextColor,
    backgroundColor,
    setBackgroundColor,
    isBold,
    setIsBold,
    isItalic,
    setIsItalic,
    isUnderline,
    setIsUnderline,
    lineHeight,
    setLineHeight,
    letterSpacing,
    setLetterSpacing,
    addText,
    updateSelectedText,
  };
}

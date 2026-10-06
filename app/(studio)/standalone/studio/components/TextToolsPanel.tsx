"use client";

import React from "react";
import { Bold, Italic, Underline, Loader2, Baseline, Highlighter } from "lucide-react";
import { RgbaColorPicker } from "react-colorful";
import type { EyedropperTarget } from "../hooks/use-eyedropper";
import { rgbaToString } from "../utils/image-editor-utils";
import type { FontAsset, RgbaColor } from "../types/image-editor-types";
import { TextAlignCenterIcon, TextAlignLeftIcon, TextAlignRightIcon, TextToolIcon } from "./editor-icons";
import { StudioColorControl, StudioSliderRow, StudioSquareButton, studioForm } from "./studio-ui";
import { PresetTextList } from "./PresetTextList";
import { FontPicker } from "./FontPicker";

export interface TextToolsPanelProps {
  selectedObject: any;
  fontAssets: FontAsset[];
  fontsReady?: boolean;
  addText: () => void;
  fontSize: number;
  setFontSize: (n: number) => void;
  fontFamily: string;
  setFontFamily: (s: string) => void;
  isBold: boolean;
  setIsBold: (b: boolean) => void;
  isItalic: boolean;
  setIsItalic: (b: boolean) => void;
  isUnderline: boolean;
  setIsUnderline: (b: boolean) => void;
  lineHeight: number;
  setLineHeight: (n: number) => void;
  letterSpacing: number;
  setLetterSpacing: (n: number) => void;
  textAlign: "left" | "center" | "right";
  setTextAlign: (align: "left" | "center" | "right") => void;
  textColor: RgbaColor;
  setTextColor: (c: RgbaColor) => void;
  backgroundColor: RgbaColor;
  setBackgroundColor: (c: RgbaColor) => void;
  eyedropperTarget: EyedropperTarget;
  onStartEyedropper?: (target: EyedropperTarget) => void;
  /** Preset texts from the `text` query param, shown for manual insertion. */
  presetTexts?: string[];
  usedPresetIndexes?: Set<number>;
  onInsertPreset?: (index: number) => void;
  onInsertAllPresets?: () => void;
}

export const TextToolsPanel = React.memo(function TextToolsPanel({
  selectedObject,
  fontAssets,
  fontsReady = true,
  addText,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
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
  textAlign,
  setTextAlign,
  textColor,
  setTextColor,
  backgroundColor,
  setBackgroundColor,
  eyedropperTarget,
  onStartEyedropper,
  presetTexts = [],
  usedPresetIndexes,
  onInsertPreset,
  onInsertAllPresets,
}: TextToolsPanelProps) {
  const isAddTextDisabled = fontAssets.length > 0 && !fontsReady;

  return (
    <div className={studioForm.section}>
      <button
        type="button"
        onClick={addText}
        disabled={isAddTextDisabled}
        className={studioForm.primaryButton}
      >
        {isAddTextDisabled ? (
          <>
            <Loader2 className="size-[19px] animate-spin shrink-0" aria-hidden />
            Loading fonts...
          </>
        ) : (
          <>
            <TextToolIcon />
            Add a text box
          </>
        )}
      </button>

      <div className={studioForm.divider} />

      {presetTexts.length > 0 && onInsertPreset && onInsertAllPresets ? (
        <>
          <PresetTextList
            presets={presetTexts}
            usedIndexes={usedPresetIndexes ?? new Set()}
            onInsert={onInsertPreset}
            onInsertAll={onInsertAllPresets}
            disabled={isAddTextDisabled}
          />
          <div className={studioForm.divider} />
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[130px] flex-1">
          <FontPicker
            fontAssets={fontAssets}
            fontFamily={fontFamily}
            setFontFamily={setFontFamily}
            disabled={!selectedObject}
          />
        </div>
        <div className="flex shrink-0 gap-1.5">
          <StudioSquareButton label="Bold" active={isBold} disabled={!selectedObject} onClick={() => setIsBold(!isBold)}>
            <Bold className="size-[18px]" />
          </StudioSquareButton>
          <StudioSquareButton label="Italic" active={isItalic} disabled={!selectedObject} onClick={() => setIsItalic(!isItalic)}>
            <Italic className="size-[18px]" />
          </StudioSquareButton>
          <StudioSquareButton label="Underline" active={isUnderline} disabled={!selectedObject} onClick={() => setIsUnderline(!isUnderline)}>
            <Underline className="size-[18px]" />
          </StudioSquareButton>
        </div>
      </div>

      <div className={studioForm.divider} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          <StudioSquareButton label="Align left" active={textAlign === "left"} disabled={!selectedObject} onClick={() => setTextAlign("left")}>
            <TextAlignLeftIcon />
          </StudioSquareButton>
          <StudioSquareButton label="Align center" active={textAlign === "center"} disabled={!selectedObject} onClick={() => setTextAlign("center")}>
            <TextAlignCenterIcon />
          </StudioSquareButton>
          <StudioSquareButton label="Align right" active={textAlign === "right"} disabled={!selectedObject} onClick={() => setTextAlign("right")}>
            <TextAlignRightIcon />
          </StudioSquareButton>
        </div>
        <div className="flex-1" />
        <div className={studioForm.colorControlGroup}>
          <StudioColorControl
            label="Text color"
            color={rgbaToString(textColor)}
            disabled={!selectedObject}
            icon={<Baseline className="size-[18px]" strokeWidth={2} />}
            eyedropperActive={eyedropperTarget === "textColor"}
            onStartEyedropper={
              onStartEyedropper ? () => onStartEyedropper("textColor") : undefined
            }
          >
            <RgbaColorPicker color={textColor} onChange={setTextColor} />
          </StudioColorControl>
          <StudioColorControl
            label="Highlight color"
            color={rgbaToString(backgroundColor)}
            disabled={!selectedObject}
            icon={<Highlighter className="size-[18px]" strokeWidth={2} />}
            eyedropperActive={eyedropperTarget === "backgroundColor"}
            onStartEyedropper={
              onStartEyedropper ? () => onStartEyedropper("backgroundColor") : undefined
            }
          >
            <RgbaColorPicker color={backgroundColor} onChange={setBackgroundColor} />
          </StudioColorControl>
        </div>
      </div>

      <div className={studioForm.divider} />

      <StudioSliderRow
        label="Size"
        labelClassName={studioForm.labelNarrow}
        value={fontSize}
        displayValue={`${fontSize}px`}
        min={12}
        max={72}
        step={1}
        onChange={setFontSize}
        disabled={!selectedObject}
      />
      <StudioSliderRow
        label="Line"
        labelClassName={studioForm.labelNarrow}
        value={lineHeight}
        displayValue={lineHeight.toFixed(1)}
        min={0.8}
        max={3.0}
        step={0.1}
        onChange={setLineHeight}
        disabled={!selectedObject}
      />
    </div>
  );
});

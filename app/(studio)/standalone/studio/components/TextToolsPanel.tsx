"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bold, Italic, Underline, PlusIcon } from "lucide-react";
import { RgbaColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { rgbaToString } from "../utils/image-editor-utils";
import type { RgbaColor } from "../types/image-editor-types";
import type { FontAsset } from "../types/image-editor-types";

export interface TextToolsPanelProps {
  selectedObject: any;
  fontAssets: FontAsset[];
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
  textColor: RgbaColor;
  setTextColor: (c: RgbaColor) => void;
  backgroundColor: RgbaColor;
  setBackgroundColor: (c: RgbaColor) => void;
}

export const TextToolsPanel = React.memo(function TextToolsPanel({
  selectedObject,
  fontAssets,
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
  textColor,
  setTextColor,
  backgroundColor,
  setBackgroundColor,
}: TextToolsPanelProps) {
  return (
    <div className="space-y-5 w-full">
      <Button
        onClick={addText}
        className="w-full h-[44px] bg-[#5C38F3] text-white shadow-md cursor-pointer text-[15px] leading-[160%] font-semibold font-(family-name:--font-manrope) rounded-[10px] transition-all hover:bg-[#4A2DD1] hover:shadow-lg active:scale-[0.98]"
      >
        <PlusIcon />
        Add Text
      </Button>
      <div className="w-full  h-[1px] bg-[#2D2D2D]"></div>
      <div className="grid grid-cols-2 gap-[20px]">
        <div className="w-full">
          <Select
            value={fontFamily}
            onValueChange={setFontFamily}
            disabled={!selectedObject}
          >
            <SelectTrigger className="w-full bg-[#0D0D0D] py-[10px] px-[16px] border-[#2D2D2D] text-[13px] font-medium leading-[135%] text-white font-(family-name:--font-manrope) h-[44px]! rounded-[10px] transition-all hover:border-[#444] focus:ring-2 focus:ring-[#5C38F3]/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontAssets.length > 0 ? (
                fontAssets.map((font) => (
                  <SelectItem
                    key={font.font_family}
                    value={font.font_family}
                    style={{ fontFamily: font.font_family }}
                  >
                    {font.font_family}
                  </SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="Manrope" className="font-(family-name:--font-manrope)">Manrope</SelectItem>
                  <SelectItem value="IBM Plex Sans" className="font-(family-name:--font-ibm-plex-sans)">IBM Plex Sans</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="grid grid-cols-3 gap-[5px] h-full">
            <Button
              variant={isBold ? "default" : "outline"}
              size="sm"
              onClick={() => setIsBold(!isBold)}
              disabled={!selectedObject}
              className={cn(
                "h-full cursor-pointer bg-[#191919] rounded-[10px] border border-[#2D2D2D] transition-all hover:bg-[#252525] hover:border-[#444] active:scale-95",
                isBold && "bg-[#0D0D0D] border-[#5C38F3] shadow-sm"
              )}
            >
              <Bold className="w-4 h-4 text-white" />
            </Button>
            <Button
              variant={isItalic ? "default" : "outline"}
              size="sm"
              onClick={() => setIsItalic(!isItalic)}
              disabled={!selectedObject}
              className={cn(
                "h-full cursor-pointer bg-[#191919] rounded-[10px] border border-[#2D2D2D] transition-all hover:bg-[#252525] hover:border-[#444] active:scale-95",
                isItalic && "bg-[#0D0D0D] border-[#5C38F3] shadow-sm"
              )}
            >
              <Italic className="w-4 h-4 text-white" />
            </Button>
            <Button
              variant={isUnderline ? "default" : "outline"}
              size="sm"
              onClick={() => setIsUnderline(!isUnderline)}
              disabled={!selectedObject}
              className={cn(
                "h-full cursor-pointer bg-[#191919] rounded-[10px] border border-[#2D2D2D] transition-all hover:bg-[#252525] hover:border-[#444] active:scale-95",
                isUnderline && "bg-[#0D0D0D] border-[#5C38F3] shadow-sm"
              )}
            >
              <Underline className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr_40px] gap-[11px] items-center">
        <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block">
          Size
        </Label>
        <div>
          <Slider
            value={[fontSize]}
            onValueChange={([value]) => setFontSize(value)}
            min={12}
            max={72}
            step={1}
            className="w-full"
            disabled={!selectedObject}
          />
        </div>
        <div className="p-[5px] rounded-[5px] border border-[#303030] font-(family-name:--font-manrope) text-[13px] font-medium leading-[135%] text-[#929292] text-center transition-colors hover:border-[#444]">
          {fontSize}px
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr_40px] gap-[11px] items-center">
        <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block">
          Line Height
        </Label>
        <Slider
          value={[lineHeight]}
          onValueChange={([value]) => setLineHeight(value)}
          min={0.8}
          max={3.0}
          step={0.1}
          disabled={!selectedObject}
        />
        <div className="p-[5px] rounded-[5px] border border-[#303030] font-(family-name:--font-manrope) text-[13px] font-medium leading-[135%] text-[#929292] text-center transition-colors hover:border-[#444]">
          <span>{lineHeight.toFixed(1)}</span>
        </div>
      </div>
      <div className="w-full  h-[1px] bg-[#2D2D2D]"></div>
      <div className="flex gap-[50px]">
        <div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={!selectedObject}
                className="w-full justify-start gap-[14px] px-0 cursor-pointer bg-transparent border-none group hover:bg-transparent"
              >
                <div
                  className="w-8 h-8 rounded-full border-2 border-[#C5CAD9] shadow-sm transition-transform"
                  style={{ backgroundColor: rgbaToString(textColor) }}
                />
                <div className="flex flex-col gap-[2px] items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M2 17.0588H4.82353M11.4118 17.0588H18M4.72941 12.3529H11.2235M7.83529 4.16471L13.2941 17.0588M2.94118 17.0588L8.58823 2H10.4706L17.0588 17.0588" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="h-[2px] w-[20px] bg-[#E5E5EF]"></div>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <RgbaColorPicker color={textColor} onChange={setTextColor} />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={!selectedObject}
                className="w-full justify-start gap-[14px] px-0 cursor-pointer bg-transparent border-none group hover:bg-transparent"
              >
                <div
                  className="w-8 h-8 rounded-full border-2 border-[#C5CAD9] shadow-sm transition-transform"
                  style={{ backgroundColor: rgbaToString(backgroundColor) }}
                />
                <div className="rounded-[3px] bg-white p-[4px] h-[28px] w-[28px] flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M2 17.0588H4.82353M11.4118 17.0588H18M4.72941 12.3529H11.2235M7.83529 4.16471L13.2941 17.0588M2.94118 17.0588L8.58823 2H10.4706L17.0588 17.0588" stroke="#191919" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <RgbaColorPicker color={backgroundColor} onChange={setBackgroundColor} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
});

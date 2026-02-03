"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload } from "lucide-react";

export interface QrToolsPanelProps {
  qrUrl: string;
  setQrUrl: (s: string) => void;
  addQRFromUrl: () => void;
  handleQRFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  qrSize: number;
  setQrSize: (n: number) => void;
  qrOpacity: number;
  setQrOpacity: (n: number) => void;
}

export const QrToolsPanel = React.memo(function QrToolsPanel({
  qrUrl,
  setQrUrl,
  addQRFromUrl,
  handleQRFileUpload,
  qrSize,
  setQrSize,
  qrOpacity,
  setQrOpacity,
}: QrToolsPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex gap-[10px]">
          <Input
            type="text"
            placeholder="Enter URL to generate QR"
            value={qrUrl}
            onChange={(e) => setQrUrl(e.target.value)}
            className="flex-1 border-[#2D2D2D] text-[13px] text-white placeholder-white rounded-[10px] px-[16px] py-[10px] h-[44px] transition-all focus:ring-2 focus:ring-[#5C38F3]/20 focus:border-[#5C38F3]"
            onKeyDown={(e) => {
              if (e.key === "Enter") addQRFromUrl();
            }}
          />
          <Button
            onClick={addQRFromUrl}
            disabled={!qrUrl.trim()}
            className="bg-[#5C38F3] text-white shadow-md cursor-pointer text-[15px] leading-[160%] font-semibold font-(family-name:--font-manrope) border-none rounded-[10px] h-[44px] transition-all hover:bg-[#4A2DD1] hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#5C38F3] disabled:active:scale-100"
          >
            Generate
          </Button>
        </div>
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#303030]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[#191919] px-2 text-white text-[13px] font-medium leading-[135%] font-(family-name:--font-manrope)">
            OR
          </span>
        </div>
      </div>
      <div>
        <Button
          onClick={() => document.getElementById("qrFileInput")?.click()}
          variant="outline"
          className="bg-[#5C38F3] text-white shadow-md cursor-pointer text-[15px] leading-[160%] font-semibold font-(family-name:--font-manrope) border-none rounded-[10px] w-full h-[44px] transition-all hover:bg-[#4A2DD1] hover:shadow-lg active:scale-[0.98]"
        >
          <Upload className="w-5 h-5 mr-2 text-white" />
          <span className="text-white font-(family-name:--font-manrope) text-[15px] font-medium leading-[160%]">
            Upload QR Image
          </span>
        </Button>
        <Input
          id="qrFileInput"
          type="file"
          accept="image/*"
          onChange={handleQRFileUpload}
          className="sr-only w-fit"
        />
      </div>
      <div className="grid grid-cols-[auto_1fr_50px] gap-[11px] items-center">
        <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block">
          Size
        </Label>
        <Slider
          value={[qrSize]}
          onValueChange={([value]) => setQrSize(value)}
          min={50}
          max={400}
          step={10}
        />
        <div className="p-[5px] rounded-[5px] border border-[#303030] font-(family-name:--font-manrope) text-[13px] font-medium leading-[135%] text-[#929292] text-center transition-colors hover:border-[#444]">
          {qrSize}px
        </div>
      </div>
      <div className="grid grid-cols-[auto_1fr_50px] gap-[11px] items-center">
        <Label className="text-[13px] leading-[110%] font-semibold text-[#F4F4F4] font-(family-name:--font-manrope) block">
          Opacity
        </Label>
        <Slider
          value={[qrOpacity]}
          onValueChange={([value]) => setQrOpacity(value)}
          min={10}
          max={100}
          step={5}
        />
        <div className="p-[5px] rounded-[5px] border border-[#303030] font-(family-name:--font-manrope) text-[13px] font-medium leading-[135%] text-[#929292] text-center transition-colors hover:border-[#444]">
          {qrOpacity}%
        </div>
      </div>
    </div>
  );
});

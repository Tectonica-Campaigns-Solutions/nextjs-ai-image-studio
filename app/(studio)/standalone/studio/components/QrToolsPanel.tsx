"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudioOrDivider, StudioSliderRow, studioForm } from "./studio-ui";

export interface QrToolsPanelProps {
  qrUrl: string;
  setQrUrl: (s: string) => void;
  addQRFromUrl: () => void;
  handleQRFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  qrSize: number;
  setQrSize: (n: number) => void;
  qrOpacity: number;
  setQrOpacity: (n: number) => void;
  isQrSelected?: boolean;
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
  isQrSelected = false,
}: QrToolsPanelProps) {
  return (
    <div className={studioForm.section}>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter URL to generate…"
          value={qrUrl}
          onChange={(e) => setQrUrl(e.target.value)}
          className={cn(studioForm.input, "flex-1 min-w-0")}
          onKeyDown={(e) => {
            if (e.key === "Enter") addQRFromUrl();
          }}
        />
        <button
          type="button"
          onClick={addQRFromUrl}
          disabled={!qrUrl.trim()}
          className={studioForm.inlinePrimaryButton}
        >
          Generate
        </button>
      </div>

      <StudioOrDivider />

      <button
        type="button"
        onClick={() => document.getElementById("qrFileInput")?.click()}
        className={studioForm.primaryButton}
      >
        <Upload className="size-[19px]" strokeWidth={2.2} aria-hidden />
        Upload QR Image
      </button>
      <Input
        id="qrFileInput"
        type="file"
        accept="image/*"
        onChange={handleQRFileUpload}
        className="sr-only"
      />

      <div className={cn(!isQrSelected && "pointer-events-none opacity-50")}>
        <StudioSliderRow
          label="Size"
          value={qrSize}
          displayValue={`${qrSize}px`}
          min={50}
          max={400}
          step={10}
          onChange={setQrSize}
          disabled={!isQrSelected}
        />
      </div>
      <div className={cn(!isQrSelected && "pointer-events-none opacity-50")}>
        <StudioSliderRow
          label="Opacity"
          value={qrOpacity}
          displayValue={`${qrOpacity}%`}
          min={10}
          max={100}
          step={5}
          onChange={setQrOpacity}
          disabled={!isQrSelected}
        />
      </div>
    </div>
  );
});

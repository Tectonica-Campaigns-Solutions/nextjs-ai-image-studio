"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { QrCode, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudioOrDivider, StudioPanelHint, StudioSliderRow, studioForm } from "./studio-ui";

export interface QrToolsPanelProps {
  qrUrl: string;
  setQrUrl: (s: string) => void;
  addQRFromUrl: (urlOverride?: string) => void | Promise<void>;
  handleQRFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  qrSize: number;
  setQrSize: (n: number) => void;
  qrOpacity: number;
  setQrOpacity: (n: number) => void;
  isQrSelected?: boolean;
  /** When set by the host (group page), show one-click insert. */
  groupQr?: {
    label: string | null;
    groupPageUrl: string | null;
    hasGroupQr: boolean;
    onInsert: () => void | Promise<void>;
    isInserting?: boolean;
  } | null;
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
  groupQr = null,
}: QrToolsPanelProps) {
  const showGroupQr = !!groupQr?.hasGroupQr;

  return (
    <div className={studioForm.section}>
      {showGroupQr ? (
        <>
          <button
            type="button"
            onClick={() => void groupQr.onInsert()}
            disabled={groupQr.isInserting}
            className={studioForm.primaryButton}
          >
            <QrCode className="size-[19px]" strokeWidth={2.2} aria-hidden />
            {groupQr.isInserting
              ? "Adding…"
              : groupQr.label
                ? `Add ${groupQr.label} QR`
                : "Add group QR"}
          </button>
          {groupQr.groupPageUrl ? (
            <StudioPanelHint>
              From your recruitment page — one click adds the QR to this poster.
            </StudioPanelHint>
          ) : null}
          <StudioOrDivider />
        </>
      ) : null}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter URL to generate…"
          value={qrUrl}
          onChange={(e) => setQrUrl(e.target.value)}
          className={cn(studioForm.input, "flex-1 min-w-0")}
          onKeyDown={(e) => {
            if (e.key === "Enter") void addQRFromUrl();
          }}
        />
        <button
          type="button"
          onClick={() => void addQRFromUrl()}
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

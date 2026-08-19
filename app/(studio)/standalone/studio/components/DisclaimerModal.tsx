"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ExportConfig, ExportFormat } from "../types/image-editor-types";
import type { DisclaimerPosition } from "../types/image-editor-types";
import { EXPORT, EXPORT_FORMATS, UI_COLORS } from "../constants/editor-constants";
import { studioDialog, studioForm } from "./studio-ui";

export interface DisclaimerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disclaimerPosition: DisclaimerPosition;
  setDisclaimerPosition: (p: DisclaimerPosition) => void;
  onConfirm: (config: ExportConfig) => void;
  isExporting: boolean;
}

const EXTENSION_BY_FORMAT: Record<ExportFormat, string> = {
  png: ".png",
  jpeg: ".jpeg",
  webp: ".webp",
};

export function DisclaimerModal({
  open,
  onOpenChange,
  disclaimerPosition,
  setDisclaimerPosition,
  onConfirm,
  isExporting,
}: DisclaimerModalProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>(EXPORT.DEFAULT_FORMAT);
  const [exportFilename, setExportFilename] = useState<string>(EXPORT.DEFAULT_FILENAME_BASE);

  const handleConfirm = () => {
    onConfirm({
      position: disclaimerPosition,
      format: exportFormat,
      filename: exportFilename.trim() || EXPORT.DEFAULT_FILENAME_BASE,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={studioDialog.content}>
        <DialogHeader>
          <DialogTitle className={studioDialog.title}>Configure disclaimer position</DialogTitle>
          <DialogDescription className={studioDialog.description}>
            A disclaimer will be applied to the exported image. Select in which corner it should appear.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4 pr-1">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["top-left", "Top left", "items-start justify-start"],
                ["top-right", "Top right", "items-start justify-end"],
                ["bottom-left", "Bottom left", "items-end justify-start"],
                ["bottom-right", "Bottom right", "items-end justify-end"],
              ] as const
            ).map(([value, label, alignment]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDisclaimerPosition(value)}
                className={cn(
                  "rounded-lg border p-3 transition-all cursor-pointer",
                  disclaimerPosition === value
                    ? "border-[#8069FF] bg-[rgba(128,105,255,0.12)]"
                    : "border-white/[0.09] bg-[#211E30] hover:border-white/[0.17]",
                )}
              >
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "flex size-11 rounded-lg border border-white/20 p-2",
                      alignment,
                    )}
                  >
                    <div className="size-2.5 rounded-sm bg-white/50" />
                  </div>
                  <span className="text-[12px] font-bold text-[#F5F4FB]">{label}</span>
                </div>
              </button>
            ))}
          </div>

          <div className={studioForm.section}>
            <label htmlFor="export-format" className={studioForm.label}>
              Export format
            </label>
            <select
              id="export-format"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              className={studioForm.input}
              aria-label="Export format"
            >
              {EXPORT_FORMATS.map(({ value, label }) => (
                <option key={value} value={value} className="bg-[#211E30] text-[#F5F4FB]">
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className={studioForm.section}>
            <label htmlFor="export-filename" className={studioForm.label}>
              File name
            </label>
            <div className="flex items-center gap-2">
              <input
                id="export-filename"
                type="text"
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                placeholder={EXPORT.DEFAULT_FILENAME_BASE}
                className={cn(studioForm.input, "flex-1")}
                aria-label="File name for export"
              />
              <span className="shrink-0 text-[12px] font-semibold" style={{ color: UI_COLORS.TEXT_FAINT }}>
                {EXTENSION_BY_FORMAT[exportFormat]}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className={studioDialog.footer}>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(studioForm.secondaryButton, "min-w-[96px]")}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isExporting}
            className={cn(studioForm.primaryButton, "min-w-[96px] w-auto px-4")}
          >
            {isExporting ? "Exporting…" : "Export"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

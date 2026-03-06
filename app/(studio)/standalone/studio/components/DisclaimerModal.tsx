"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { EXPORT, EXPORT_FORMATS } from "../constants/editor-constants";

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
      <DialogContent className="bg-[#191919] border-[#2D2D2D] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white font-(family-name:--font-manrope) text-[18px] font-semibold">
            Configure Disclaimer Position
          </DialogTitle>
          <DialogDescription className="text-[#929292] font-(family-name:--font-manrope) text-[14px]">
            A disclaimer will be applied to the exported image. Select in which corner it should appear.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDisclaimerPosition("top-left")}
              className={cn(
                "p-4 rounded-[10px] border-2 transition-all cursor-pointer",
                disclaimerPosition === "top-left"
                  ? "border-[#5C38F3] bg-[#5C38F3]/10"
                  : "border-[#2D2D2D] bg-[#0D0D0D] hover:border-[#444]"
              )}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 border-2 border-white/30 rounded-[8px] flex items-start justify-start p-2">
                  <div className="w-3 h-3 bg-white/50 rounded-sm" />
                </div>
                <span className="text-white text-[13px] font-medium font-(family-name:--font-manrope)">
                  Top Left
                </span>
              </div>
            </button>

            <button
              onClick={() => setDisclaimerPosition("top-right")}
              className={cn(
                "p-4 rounded-[10px] border-2 transition-all cursor-pointer",
                disclaimerPosition === "top-right"
                  ? "border-[#5C38F3] bg-[#5C38F3]/10"
                  : "border-[#2D2D2D] bg-[#0D0D0D] hover:border-[#444]"
              )}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 border-2 border-white/30 rounded-[8px] flex items-start justify-end p-2">
                  <div className="w-3 h-3 bg-white/50 rounded-sm" />
                </div>
                <span className="text-white text-[13px] font-medium font-(family-name:--font-manrope)">
                  Top Right
                </span>
              </div>
            </button>

            <button
              onClick={() => setDisclaimerPosition("bottom-left")}
              className={cn(
                "p-4 rounded-[10px] border-2 transition-all cursor-pointer",
                disclaimerPosition === "bottom-left"
                  ? "border-[#5C38F3] bg-[#5C38F3]/10"
                  : "border-[#2D2D2D] bg-[#0D0D0D] hover:border-[#444]"
              )}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 border-2 border-white/30 rounded-[8px] flex items-end justify-start p-2">
                  <div className="w-3 h-3 bg-white/50 rounded-sm" />
                </div>
                <span className="text-white text-[13px] font-medium font-(family-name:--font-manrope)">
                  Bottom Left
                </span>
              </div>
            </button>

            <button
              onClick={() => setDisclaimerPosition("bottom-right")}
              className={cn(
                "p-4 rounded-[10px] border-2 transition-all cursor-pointer",
                disclaimerPosition === "bottom-right"
                  ? "border-[#5C38F3] bg-[#5C38F3]/10"
                  : "border-[#2D2D2D] bg-[#0D0D0D] hover:border-[#444]"
              )}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 border-2 border-white/30 rounded-[8px] flex items-end justify-end p-2">
                  <div className="w-3 h-3 bg-white/50 rounded-sm" />
                </div>
                <span className="text-white text-[13px] font-medium font-(family-name:--font-manrope)">
                  Bottom Right
                </span>
              </div>
            </button>
          </div>

          <div className="space-y-2">
            <label htmlFor="export-format" className="text-[#F4F4F4] text-[13px] font-medium font-(family-name:--font-manrope) block">
              Export format
            </label>
            <select
              id="export-format"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              className="w-full rounded-[10px] border-2 border-[#2D2D2D] bg-[#0D0D0D] px-3 py-2 text-white text-[14px] font-(family-name:--font-manrope) focus:border-[#5C38F3] focus:outline-none"
              aria-label="Export format"
            >
              {EXPORT_FORMATS.map(({ value, label }) => (
                <option key={value} value={value} className="bg-[#191919] text-white">
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="export-filename" className="text-[#F4F4F4] text-[13px] font-medium font-(family-name:--font-manrope) block">
              File name
            </label>
            <div className="flex items-center gap-2">
              <input
                id="export-filename"
                type="text"
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                placeholder={EXPORT.DEFAULT_FILENAME_BASE}
                className="flex-1 rounded-[10px] border-2 border-[#2D2D2D] bg-[#0D0D0D] px-3 py-2 text-white text-[14px] font-(family-name:--font-manrope) placeholder:text-[#929292] focus:border-[#5C38F3] focus:outline-none"
                aria-label="File name for export"
              />
              <span className="text-[#929292] text-[14px] font-(family-name:--font-manrope) shrink-0">
                {EXTENSION_BY_FORMAT[exportFormat]}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#2D2D2D] bg-[#0D0D0D] text-white hover:bg-[#191919] font-(family-name:--font-manrope)"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isExporting}
            className="bg-[#5C38F3] text-white hover:bg-[#4A2DD1] font-(family-name:--font-manrope) font-semibold"
          >
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

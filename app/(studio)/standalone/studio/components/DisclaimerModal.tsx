"use client";

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
import type { DisclaimerPosition } from "../types/image-editor-types";

export interface DisclaimerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disclaimerPosition: DisclaimerPosition;
  setDisclaimerPosition: (p: DisclaimerPosition) => void;
  onConfirm: () => void;
  isExporting: boolean;
}

export function DisclaimerModal({
  open,
  onOpenChange,
  disclaimerPosition,
  setDisclaimerPosition,
  onConfirm,
  isExporting,
}: DisclaimerModalProps) {
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
            onClick={onConfirm}
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

"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CROP_ASPECTS } from "../lib/crop";
import { studioForm } from "./studio-ui";

export function CropPanel({
  aspectKey,
  onAspectChange,
  outputSize,
  isApplying,
  onApply,
  onReset,
}: {
  aspectKey: string;
  onAspectChange: (key: string) => void;
  /** Size of the cropped image in pixels, for the readout. */
  outputSize: { width: number; height: number } | null;
  isApplying: boolean;
  onApply: () => void;
  onReset: () => void;
}) {
  return (
    <div className={studioForm.section}>
      <p className={studioForm.hint}>
        Drag the box or its corners on the image. Pick a size to lock the shape.
      </p>

      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Crop shape">
        {CROP_ASPECTS.map((a) => {
          const active = a.key === aspectKey;
          return (
            <button
              key={a.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onAspectChange(a.key)}
              className={cn(
                "h-10 cursor-pointer rounded-[10px] border text-[12.5px] font-bold transition-colors",
                active
                  ? "border-[#8069FF] bg-[rgba(128,105,255,0.16)] text-[#F5F4FB]"
                  : "border-white/[0.09] bg-[#211E30] text-[#ADAAC0] hover:bg-[#2C2942] hover:text-[#F5F4FB]",
              )}
            >
              {a.label}
            </button>
          );
        })}
      </div>

      {outputSize ? (
        <p className="text-[12px] text-[#ADAAC0]">
          Result: <span className="font-semibold text-[#F5F4FB] tabular-nums">{outputSize.width} × {outputSize.height}px</span>
        </p>
      ) : null}

      <div className="flex gap-2">
        <button type="button" onClick={onReset} className={cn(studioForm.secondaryButton, "flex-1")} disabled={isApplying}>
          Reset
        </button>
        <button type="button" onClick={onApply} className={cn(studioForm.inlinePrimaryButton, "flex-1")} disabled={isApplying}>
          {isApplying ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
          Apply crop
        </button>
      </div>

      <p className="text-[11.5px] leading-[1.4] text-[#726F86]">
        A crop can&apos;t be undone with Undo. Text, logos and other elements keep their place on
        the image.
      </p>
    </div>
  );
}

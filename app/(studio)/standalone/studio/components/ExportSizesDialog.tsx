"use client";

import { useEffect, useState } from "react";
import { Check, Download, ImagePlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { BrandFormatPreset } from "@/lib/brand-templates/formats";
import type { BrandFormatKey } from "@/lib/brand-templates/types";
import { studioDialog, studioForm } from "./studio-ui";

export type ExportSizesAction = "download" | "media";

/** Pick which formats of a template design to download or save to Media. */
export function ExportSizesDialog({
  open,
  onOpenChange,
  formats,
  currentFormat,
  busyAction,
  progress,
  canSaveToMedia,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formats: BrandFormatPreset[];
  currentFormat: BrandFormatKey;
  busyAction: ExportSizesAction | null;
  /** e.g. "2 of 3" while rendering. */
  progress: string | null;
  canSaveToMedia: boolean;
  onConfirm: (action: ExportSizesAction, keys: BrandFormatKey[]) => void;
}) {
  const [selected, setSelected] = useState<Set<BrandFormatKey>>(new Set([currentFormat]));

  useEffect(() => {
    if (open) setSelected(new Set([currentFormat]));
  }, [open, currentFormat]);

  const toggle = (key: BrandFormatKey) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const busy = busyAction !== null;
  const keys = formats.filter((f) => selected.has(f.key)).map((f) => f.key);

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className={studioDialog.content}>
        <DialogHeader>
          <DialogTitle className={studioDialog.title}>Export sizes</DialogTitle>
          <DialogDescription className={studioDialog.description}>
            Your texts, photos and colors are applied to each size&apos;s layout.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-4" role="group" aria-label="Sizes">
          {formats.map((f) => {
            const checked = selected.has(f.key);
            return (
              <button
                key={f.key}
                type="button"
                role="checkbox"
                aria-checked={checked}
                disabled={busy}
                onClick={() => toggle(f.key)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[12px] border p-3 text-left transition-colors disabled:cursor-wait",
                  checked
                    ? "border-[#8069FF] bg-[rgba(128,105,255,0.12)]"
                    : "border-white/[0.09] bg-[#211E30] hover:bg-[#2C2942]",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] border",
                    checked ? "border-[#8069FF] bg-[#6146F2]" : "border-white/[0.25]",
                  )}
                >
                  {checked ? <Check className="size-3.5 text-white" strokeWidth={3} aria-hidden /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-[#F5F4FB]">
                    {f.label} <span className="font-semibold text-[#ADAAC0]">· {f.ratio}</span>
                    {f.key === currentFormat ? (
                      <span className="ml-2 text-[11.5px] font-semibold text-[#8069FF]">Current</span>
                    ) : null}
                  </span>
                  <span className="block text-[12px] text-[#ADAAC0]">
                    {f.width}×{f.height} · {f.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter className={studioDialog.footer}>
          {progress ? (
            <span className="mr-auto self-center text-[12.5px] text-[#ADAAC0]">{progress}</span>
          ) : null}
          {canSaveToMedia ? (
            <button
              type="button"
              disabled={busy || keys.length === 0}
              onClick={() => onConfirm("media", keys)}
              className={cn(studioForm.secondaryButton, "min-w-[140px]")}
            >
              {busyAction === "media" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="size-4" aria-hidden />
              )}
              Save to Media
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy || keys.length === 0}
            onClick={() => onConfirm("download", keys)}
            className={cn(studioForm.primaryButton, "w-auto min-w-[140px] px-4")}
          >
            {busyAction === "download" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            {keys.length > 1 ? `Download ${keys.length}` : "Download"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

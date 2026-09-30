"use client";

import React from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { studioForm } from "./studio-ui";

export interface PresetTextListProps {
  /** Preset texts received via the `text` query param. */
  presets: string[];
  /** Indexes of presets already inserted in this editor session. */
  usedIndexes: Set<number>;
  onInsert: (index: number) => void;
  onInsertAll: () => void;
  disabled?: boolean;
  /** `popover` is the compact variant used by the mobile float controls. */
  variant?: "panel" | "popover";
}

/**
 * Selectable list of preset texts. Clicking a row inserts that text on the canvas;
 * inserted rows stay in the list marked as "Added" so they can be reused.
 */
export function PresetTextList({
  presets,
  usedIndexes,
  onInsert,
  onInsertAll,
  disabled = false,
  variant = "panel",
}: PresetTextListProps) {
  if (presets.length === 0) return null;

  const isPopover = variant === "popover";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className={studioForm.label}>Preset texts</span>
        <span className="text-[11.5px] text-[#726F86]">Click to add</span>
      </div>

      <ul
        className={cn(
          "flex flex-col gap-1.5 overflow-y-auto",
          isPopover ? "max-h-[220px]" : "max-h-[260px]",
        )}
      >
        {presets.map((preset, index) => {
          const used = usedIndexes.has(index);
          return (
            <li key={`${index}-${preset}`}>
              <button
                type="button"
                onClick={() => onInsert(index)}
                disabled={disabled}
                title={preset}
                className={cn(
                  studioForm.layerItem,
                  "w-full cursor-pointer py-2.5 text-left disabled:cursor-not-allowed disabled:opacity-50",
                  used && studioForm.layerItemSelected,
                )}
              >
                <span className="line-clamp-2 min-w-0 flex-1 break-words text-[13px] font-semibold text-[#F5F4FB]">
                  {preset}
                </span>
                {used ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-bold text-[#8069FF]">
                    <Check className="size-[14px]" strokeWidth={2.5} aria-hidden />
                    Added
                  </span>
                ) : (
                  <Plus className="size-[16px] shrink-0 text-[#ADAAC0]" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {presets.length > 1 ? (
        <button
          type="button"
          onClick={onInsertAll}
          disabled={disabled}
          className={cn(studioForm.secondaryButton, "w-full", isPopover && "h-10")}
        >
          <Plus className="size-[16px]" aria-hidden />
          Add all
        </button>
      ) : null}
    </div>
  );
}

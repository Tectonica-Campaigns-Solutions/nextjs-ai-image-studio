"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignVerticalSpaceBetween,
} from "lucide-react";
import type { AlignOption } from "../hooks/use-alignment-tools";

export interface AlignmentPopoverProps {
  onAlign: (option: AlignOption) => void;
  selectedObject: any;
  /** When true, show mobile-friendly layout */
  variant?: "mobile" | "desktop";
}

const alignToCanvasOptions: { option: AlignOption; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { option: "align-left", label: "Align left", Icon: AlignLeft },
  { option: "align-center-h", label: "Align center", Icon: AlignCenter },
  { option: "align-right", label: "Align right", Icon: AlignRight },
  { option: "align-top", label: "Align top", Icon: AlignStartVertical },
  { option: "align-center-v", label: "Align middle", Icon: AlignCenterVertical },
  { option: "align-bottom", label: "Align bottom", Icon: AlignEndVertical },
];

const distributeOptions: { option: AlignOption; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { option: "distribute-h", label: "Distribute horizontal", Icon: AlignHorizontalSpaceBetween },
  { option: "distribute-v", label: "Distribute vertical", Icon: AlignVerticalSpaceBetween },
];

export function AlignmentPopover({
  onAlign,
  selectedObject,
  variant = "desktop",
}: AlignmentPopoverProps) {
  const hasSelection = !!selectedObject;
  const isMultiSelection =
    hasSelection &&
    (selectedObject as any).type === "activeselection" &&
    typeof (selectedObject as any).getObjects === "function";
  const multiCount = isMultiSelection ? (selectedObject as any).getObjects().length : 0;
  const canDistribute = isMultiSelection && multiCount >= 3;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasSelection}
          className="h-[44px] w-[54px] px-[15px] py-[10px] flex items-center justify-center rounded-[10px] border-0 bg-[#ffffff1a] text-white font-semibold cursor-pointer disabled:cursor-not-allowed transition-all hover:bg-[#ffffff2a] disabled:hover:bg-[#ffffff1a] disabled:opacity-50"
          aria-label="Alignment options"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2 bg-[#191919] border-[#2D2D2D] rounded-[10px]"
        align={variant === "desktop" ? "start" : "center"}
      >
        <p className="text-[10px] uppercase tracking-wider text-white/40 px-1 mb-1.5 font-(family-name:--font-manrope)">
          Align to canvas
        </p>
        <div className="grid grid-cols-3 gap-1">
          {alignToCanvasOptions.map(({ option, label, Icon }) => (
            <Button
              key={option}
              variant="ghost"
              size="sm"
              onClick={() => onAlign(option)}
              className="h-9 w-9 p-0 text-white hover:bg-white/10"
              title={label}
              aria-label={label}
            >
              <Icon className="w-4 h-4" />
            </Button>
          ))}
        </div>

        <div className="border-t border-[#2D2D2D] my-2" />

        <p className="text-[10px] uppercase tracking-wider text-white/40 px-1 mb-1.5 font-(family-name:--font-manrope)">
          Distribute
        </p>
        <div className="flex gap-1">
          {distributeOptions.map(({ option, label, Icon }) => (
            <Button
              key={option}
              variant="ghost"
              size="sm"
              disabled={!canDistribute}
              onClick={() => onAlign(option)}
              className="h-9 w-9 p-0 text-white hover:bg-white/10 disabled:opacity-30"
              title={canDistribute ? label : `${label} (select 3+ layers)`}
              aria-label={label}
            >
              <Icon className="w-4 h-4" />
            </Button>
          ))}
        </div>
        {!canDistribute && (
          <p className="text-[10px] text-white/35 mt-1.5 px-1 font-(family-name:--font-manrope)">
            {isMultiSelection && multiCount === 2
              ? "Select 1 more layer to distribute"
              : "Select 3+ layers to distribute"}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

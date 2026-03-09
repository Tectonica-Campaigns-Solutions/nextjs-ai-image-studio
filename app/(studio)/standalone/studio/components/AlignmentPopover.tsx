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

const alignOptions: { option: AlignOption; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { option: "align-left", label: "Align left", Icon: AlignLeft },
  { option: "align-center-h", label: "Align center", Icon: AlignCenter },
  { option: "align-right", label: "Align right", Icon: AlignRight },
  { option: "align-top", label: "Align top", Icon: AlignStartVertical },
  { option: "align-center-v", label: "Align middle", Icon: AlignCenterVertical },
  { option: "align-bottom", label: "Align bottom", Icon: AlignEndVertical },
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
    (selectedObject as any).type === "activeSelection" &&
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
        <div className="grid grid-cols-4 gap-1">
          {alignOptions.map(({ option, label, Icon }) => (
            <Button
              key={option}
              variant="ghost"
              size="sm"
              disabled={option.startsWith("distribute") && !canDistribute}
              onClick={() => onAlign(option)}
              className="h-9 w-9 p-0 text-white hover:bg-white/10 disabled:opacity-40"
              title={label}
              aria-label={label}
            >
              <Icon className="w-4 h-4" />
            </Button>
          ))}
        </div>
        <p className="text-[11px] text-white/50 mt-2 px-1 font-(family-name:--font-manrope)">
          {!canDistribute && (selectedObject as any)?.type === "activeSelection"
            ? "Select 3+ objects to distribute"
            : "Align to canvas"}
        </p>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { StudioIconButton } from "./studio-ui";
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
  /** Compact 36px trigger for floating canvas controls */
  compact?: boolean;
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
  compact = false,
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
        {compact ? (
          <button
            type="button"
            title="Align to canvas"
            aria-label="Align to canvas"
            disabled={!hasSelection}
            className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.09] bg-[#211E30] text-[#F5F4FB] transition-colors duration-160 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <AlignLeft className="size-[17px]" />
          </button>
        ) : (
          <StudioIconButton label="Align to canvas" disabled={!hasSelection}>
            <AlignLeft className="size-[18px]" />
          </StudioIconButton>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="vs-pop w-[218px] p-3.5 bg-[#211E30] border-white/[0.17] rounded-[14px] shadow-[0_24px_48px_-18px_rgba(0,0,0,0.75)]"
        align={variant === "desktop" ? "end" : "center"}
        side={compact ? "top" : undefined}
      >
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#726F86]">
          Align to canvas
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            {alignToCanvasOptions.slice(3, 6).map(({ option, label, Icon }) => (
              <Button
                key={option}
                variant="ghost"
                size="sm"
                onClick={() => onAlign(option)}
                className="size-10 p-0 rounded-[10px] border border-white/[0.09] text-[#ADAAC0] hover:bg-[#2C2942]"
                title={label}
                aria-label={label}
              >
                <Icon className="size-[18px]" />
              </Button>
            ))}
          </div>
          <div className="flex justify-between">
            {alignToCanvasOptions.slice(0, 3).map(({ option, label, Icon }) => (
              <Button
                key={option}
                variant="ghost"
                size="sm"
                onClick={() => onAlign(option)}
                className="size-10 p-0 rounded-[10px] border border-white/[0.09] text-[#ADAAC0] hover:bg-[#2C2942]"
                title={label}
                aria-label={label}
              >
                <Icon className="size-[18px]" />
              </Button>
            ))}
          </div>
        </div>

        <div className="my-3 h-px bg-white/[0.09]" />

        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#726F86]">
          Distribute
        </p>
        <div className="flex gap-2">
          {distributeOptions.map(({ option, label, Icon }) => (
            <Button
              key={option}
              variant="ghost"
              size="sm"
              disabled={!canDistribute}
              onClick={() => onAlign(option)}
              className="size-10 p-0 rounded-[10px] border border-white/[0.09] text-[#726F86] hover:bg-[#2C2942] disabled:opacity-50 disabled:cursor-not-allowed"
              title={canDistribute ? label : `${label} (select 3+ layers)`}
              aria-label={label}
            >
              <Icon className="size-[18px]" />
            </Button>
          ))}
        </div>
        {!canDistribute && (
          <p className="mt-2 text-[11.5px] text-[#726F86]">
            {isMultiSelection && multiCount === 2
              ? "Select 1 more layer to distribute"
              : "Select 3+ layers to distribute"}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

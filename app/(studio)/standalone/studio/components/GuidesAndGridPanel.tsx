"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface GuidesAndGridPanelProps {
  showGrid: boolean;
  onShowGridChange: (value: boolean) => void;
}

export function GuidesAndGridPanel({
  showGrid,
  onShowGridChange,
}: GuidesAndGridPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-white/70 font-(family-name:--font-manrope)">
        Grid helps align objects visually while you edit.
      </p>
      <label
        className={cn(
          "flex items-center gap-2 cursor-pointer select-none"
        )}
      >
        <Checkbox
          checked={showGrid}
          onCheckedChange={(checked) => onShowGridChange(checked === true)}
          className="border-[#2D2D2D] data-[state=checked]:bg-[#5C38F3] data-[state=checked]:border-[#5C38F3]"
        />
        <span className="text-[13px] text-white/90 font-(family-name:--font-manrope)">
          Show grid
        </span>
      </label>
    </div>
  );
}

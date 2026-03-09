"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface GuidesAndGridPanelProps {
  showGrid: boolean;
  onShowGridChange: (value: boolean) => void;
  guidePositions: { v: number[]; h: number[] };
  onAddCenterGuides: () => void;
  onClearGuides: () => void;
  canvasWidth: number;
  canvasHeight: number;
}

export function GuidesAndGridPanel({
  showGrid,
  onShowGridChange,
  guidePositions,
  onAddCenterGuides,
  onClearGuides,
  canvasWidth,
  canvasHeight,
}: GuidesAndGridPanelProps) {
  const hasGuides = guidePositions.v.length > 0 || guidePositions.h.length > 0;

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-white/70 font-(family-name:--font-manrope)">
        Grid and guides help align objects. Objects snap to guides when moving.
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
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddCenterGuides}
          disabled={canvasWidth <= 0 || canvasHeight <= 0}
          className="h-9 rounded-[8px] border-[#2D2D2D] bg-[#1F1F1F] text-white text-[13px] font-(family-name:--font-manrope) hover:bg-[#252525]"
        >
          Add center guides
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearGuides}
          disabled={!hasGuides}
          className="h-9 rounded-[8px] border-[#2D2D2D] bg-[#1F1F1F] text-white text-[13px] font-(family-name:--font-manrope) hover:bg-[#252525] disabled:opacity-50"
        >
          Clear guides
        </Button>
      </div>
      {hasGuides && (
        <p className="text-[12px] text-white/50 font-(family-name:--font-manrope)">
          {guidePositions.v.length} vertical, {guidePositions.h.length} horizontal guide(s)
        </p>
      )}
    </div>
  );
}

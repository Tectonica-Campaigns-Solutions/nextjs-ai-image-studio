"use client";

import React from "react";
import { StudioCheckboxRow, StudioPanelHint, studioForm } from "./studio-ui";

export interface GuidesAndGridPanelProps {
  showGrid: boolean;
  onShowGridChange: (value: boolean) => void;
}

export function GuidesAndGridPanel({
  showGrid,
  onShowGridChange,
}: GuidesAndGridPanelProps) {
  return (
    <div className={studioForm.section}>
      <StudioPanelHint>Grid helps align objects visually while you edit.</StudioPanelHint>
      <StudioCheckboxRow
        checked={showGrid}
        onChange={onShowGridChange}
        label="Show grid"
      />
    </div>
  );
}

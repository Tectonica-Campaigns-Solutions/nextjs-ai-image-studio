"use client";

import { Maximize2, Minimize2, Palette } from "lucide-react";
import { StudioIconButton } from "./studio-ui";
import { UI_COLORS } from "../constants/editor-constants";

export interface StudioHeaderProps {
  subtitle?: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function StudioHeader({
  subtitle = "Editing",
  expanded,
  onToggleExpand,
}: StudioHeaderProps) {
  return (
    <header
      className="hidden md:flex shrink-0 items-center gap-3 border-b px-[18px] py-[14px]"
      style={{
        background: UI_COLORS.PRIMARY_BG,
        borderColor: UI_COLORS.BORDER,
        color: UI_COLORS.TEXT_PRIMARY,
      }}
    >
      <span
        className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-[10px] text-white"
        style={{ background: UI_COLORS.GRADIENT }}
      >
        <Palette className="size-[18px]" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15.5px] font-bold tracking-[-0.01em]">Visual Studio</div>
        <div className="text-[12px] font-semibold" style={{ color: UI_COLORS.TEXT_SECONDARY }}>
          {subtitle}
        </div>
      </div>
      {onToggleExpand ? (
        <StudioIconButton
          label={expanded ? "Exit full screen" : "Expand"}
          active={expanded}
          onClick={onToggleExpand}
        >
          {expanded ? <Minimize2 className="size-[18px]" /> : <Maximize2 className="size-[18px]" />}
        </StudioIconButton>
      ) : null}
    </header>
  );
}

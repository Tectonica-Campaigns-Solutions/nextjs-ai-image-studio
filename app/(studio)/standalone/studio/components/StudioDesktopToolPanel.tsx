"use client";

import { StudioPanelHeader } from "./studio-ui";
import { UI_COLORS } from "../constants/editor-constants";
import {
  getStudioTool,
  type StudioDesktopToolId,
  type StudioToolPanels,
} from "../constants/studio-tools";

export function StudioDesktopToolPanel({
  tool,
  onClose,
  panels,
}: {
  tool: StudioDesktopToolId;
  onClose: () => void;
  /** Content per tool id; "advanced-options" holds the whole accordion. */
  panels: StudioToolPanels;
}) {
  const meta = getStudioTool(tool);
  if (!meta) return null;

  return (
    <div
      className="vs-noscroll vs-slide-in absolute inset-y-0 left-0 z-[6] hidden w-[min(320px,100%)] max-w-full flex-col gap-3.5 overflow-y-auto border-r p-4 md:flex"
      style={{
        background: UI_COLORS.PRIMARY_BG,
        borderColor: UI_COLORS.BORDER,
        boxShadow: "18px 0 40px -20px rgba(0,0,0,0.6)",
      }}
    >
      <StudioPanelHeader
        icon={<meta.icon className="size-[18px]" />}
        title={meta.label}
        onClose={onClose}
      />
      {panels[tool]}
    </div>
  );
}

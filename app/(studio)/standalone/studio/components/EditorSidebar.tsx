"use client";

import type { ReactNode } from "react";
import {
  QrCode,
  SlidersHorizontal,
  Stamp,
  Type,
  WandSparkles,
} from "lucide-react";
import { STUDIO_DESKTOP_TOOLS, UI_COLORS, type StudioDesktopToolId } from "../constants/editor-constants";

const DOCK_ICONS: Record<string, ReactNode> = {
  "text-tools": <Type className="size-[17px]" strokeWidth={2} />,
  "logo-overlay": <Stamp className="size-[17px]" strokeWidth={2} />,
  "qr-code": <QrCode className="size-[17px]" strokeWidth={2} />,
  "ai-edit": <WandSparkles className="size-[17px]" strokeWidth={2} />,
  "advanced-options": <SlidersHorizontal className="size-[17px]" strokeWidth={2} />,
};

export interface EditorSidebarProps {
  textToolsPanel: ReactNode | null;
  aiEditPanel: ReactNode | null;
  logoToolsPanel: ReactNode | null;
  qrToolsPanel: ReactNode | null;
  layersToolsPanel: ReactNode | null;
  backgroundImagePanel: ReactNode | null;
  shapeToolsPanel: ReactNode | null;
  frameToolsPanel: ReactNode | null;
  guidesAndGridPanel: ReactNode | null;
  sessionsListPanel: ReactNode | null;
  desktopTool?: StudioDesktopToolId | null;
  onDesktopToolChange?: (tool: StudioDesktopToolId | null) => void;
}

export function EditorSidebar({
  textToolsPanel,
  aiEditPanel,
  logoToolsPanel,
  qrToolsPanel,
  layersToolsPanel,
  backgroundImagePanel,
  shapeToolsPanel,
  frameToolsPanel,
  guidesAndGridPanel,
  sessionsListPanel,
  desktopTool = null,
  onDesktopToolChange,
}: EditorSidebarProps) {
  const dockTools = STUDIO_DESKTOP_TOOLS.filter((t) => {
    if (t.id === "text-tools") return textToolsPanel != null;
    if (t.id === "logo-overlay") return logoToolsPanel != null;
    if (t.id === "qr-code") return qrToolsPanel != null;
    if (t.id === "ai-edit") return aiEditPanel != null;
    if (t.id === "advanced-options") {
      return (
        layersToolsPanel != null ||
        backgroundImagePanel != null ||
        shapeToolsPanel != null ||
        frameToolsPanel != null ||
        guidesAndGridPanel != null ||
        sessionsListPanel != null
      );
    }
    return true;
  });

  return (
    <aside
      className="vs-noscroll hidden md:flex w-[176px] shrink-0 flex-col gap-3 overflow-y-auto border-r p-3.5"
      style={{
        background: UI_COLORS.PRIMARY_BG,
        borderColor: UI_COLORS.BORDER,
      }}
    >
      <div
        className="px-1 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em]"
        style={{ color: UI_COLORS.TEXT_FAINT }}
      >
        Tools
      </div>
      <div className="flex flex-col gap-3">
        {dockTools.map((t) => {
          const active = desktopTool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              title={t.label}
              onClick={() => onDesktopToolChange?.(active ? null : t.id)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-[9px] rounded-[11px] border px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-160"
              style={{
                background: active ? UI_COLORS.ACCENT_SOFT : UI_COLORS.SECONDARY_BG,
                borderColor: active ? UI_COLORS.ACCENT : UI_COLORS.BORDER,
                color: active ? UI_COLORS.ACCENT : UI_COLORS.TEXT_PRIMARY,
              }}
            >
              {DOCK_ICONS[t.id]}
              <span className="flex-1 text-left">{t.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

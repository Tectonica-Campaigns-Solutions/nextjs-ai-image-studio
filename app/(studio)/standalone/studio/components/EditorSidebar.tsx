"use client";

import { UI_COLORS } from "../constants/editor-constants";
import {
  STUDIO_DOCK_TOOLS,
  isDockToolAvailable,
  type StudioDesktopToolId,
  type StudioToolPanels,
} from "../constants/studio-tools";

export interface EditorSidebarProps {
  panels: StudioToolPanels;
  desktopTool?: StudioDesktopToolId | null;
  onDesktopToolChange?: (tool: StudioDesktopToolId | null) => void;
}

export function EditorSidebar({
  panels,
  desktopTool = null,
  onDesktopToolChange,
}: EditorSidebarProps) {
  const dockTools = STUDIO_DOCK_TOOLS.filter((t) => isDockToolAvailable(t.id, panels));

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
              <t.icon className="size-[17px]" strokeWidth={2} />
              <span className="flex-1 text-left">{t.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

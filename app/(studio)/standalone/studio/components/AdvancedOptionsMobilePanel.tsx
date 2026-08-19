"use client";

import { useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  ImageIcon,
  Layers,
  Save,
  Shapes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STUDIO_ADVANCED_ROWS, UI_COLORS } from "../constants/editor-constants";
import { FrameItem } from "./editor-icons";

type AdvancedScreen = "layers" | "background" | "shapes" | "frames" | "guides" | "sessions";

const SCREEN_META: Record<
  AdvancedScreen,
  { label: string; icon: ReactNode }
> = {
  layers: { label: "Layers", icon: <Layers className="size-5" strokeWidth={2} /> },
  background: { label: "Background image", icon: <ImageIcon className="size-5" strokeWidth={2} /> },
  shapes: { label: "Shape Tools", icon: <Shapes className="size-5" strokeWidth={2} /> },
  frames: { label: "Frames", icon: <FrameItem /> },
  guides: { label: "Guides & grid", icon: <Grid3X3 className="size-5" strokeWidth={2} /> },
  sessions: { label: "Saved versions", icon: <Save className="size-5" strokeWidth={2} /> },
};

function NavRow({
  icon,
  label,
  badge,
  onClick,
  first,
}: {
  icon: ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
  first?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-[11px] px-1 py-3 text-left",
        !first && "border-t",
      )}
      style={{ borderColor: UI_COLORS.BORDER }}
    >
      <span className="inline-flex size-[34px] shrink-0 items-center justify-center text-[#F5F4FB]">
        {icon}
      </span>
      <span className="text-[15px] font-bold text-[#F5F4FB]">{label}</span>
      {badge != null ? (
        <span
          className="rounded-full border px-2 py-px text-[11.5px] font-bold leading-snug"
          style={{
            color: UI_COLORS.ACCENT,
            background: UI_COLORS.ACCENT_SOFT,
            borderColor: UI_COLORS.ACCENT,
          }}
        >
          {badge}
        </span>
      ) : null}
      <span className="flex-1" />
      <ChevronRight className="size-[18px] shrink-0 text-[#ADAAC0]" strokeWidth={2} />
    </button>
  );
}

function Breadcrumb({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-3 inline-flex cursor-pointer items-center gap-1 py-0.5 text-[13.5px] font-bold"
      style={{ color: UI_COLORS.ACCENT }}
    >
      <ChevronLeft className="size-[17px]" strokeWidth={2.2} />
      Advanced
    </button>
  );
}

export interface AdvancedOptionsMobilePanelProps {
  layersToolsPanel: ReactNode | null;
  backgroundImagePanel: ReactNode | null;
  shapeToolsPanel: ReactNode | null;
  frameToolsPanel: ReactNode | null;
  guidesAndGridPanel: ReactNode | null;
  sessionsListPanel: ReactNode | null;
  layerCount?: number;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  /** When set, open directly on this sub-screen (e.g. saved versions). */
  initialScreen?: AdvancedScreen | null;
}

export function AdvancedOptionsMobilePanel({
  layersToolsPanel,
  backgroundImagePanel,
  shapeToolsPanel,
  frameToolsPanel,
  guidesAndGridPanel,
  sessionsListPanel,
  layerCount,
  showGrid = false,
  onToggleGrid,
  initialScreen = null,
}: AdvancedOptionsMobilePanelProps) {
  const [screen, setScreen] = useState<AdvancedScreen | null>(initialScreen);

  const contentByScreen: Record<AdvancedScreen, ReactNode | null> = {
    layers: layersToolsPanel,
    background: backgroundImagePanel,
    shapes: shapeToolsPanel,
    frames: frameToolsPanel,
    guides: guidesAndGridPanel,
    sessions: sessionsListPanel,
  };

  const navRows = STUDIO_ADVANCED_ROWS.filter((row) => {
    if (row.id === "guides") return guidesAndGridPanel != null;
    return contentByScreen[row.id as AdvancedScreen] != null;
  }).filter((row) => row.id !== "guides");

  if (screen && contentByScreen[screen]) {
    return (
      <div className="flex flex-col">
        <Breadcrumb onBack={() => setScreen(null)} />
        {contentByScreen[screen]}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {navRows.map((row, index) => (
        <NavRow
          key={row.id}
          first={index === 0}
          icon={SCREEN_META[row.id as AdvancedScreen].icon}
          label={row.label}
          badge={row.id === "layers" && layerCount != null ? layerCount : undefined}
          onClick={() => setScreen(row.id as AdvancedScreen)}
        />
      ))}

      {guidesAndGridPanel != null && onToggleGrid ? (
        <button
          type="button"
          onClick={onToggleGrid}
          className="flex w-full cursor-pointer items-center gap-[11px] border-t px-1 py-3 text-left"
          style={{ borderColor: UI_COLORS.BORDER }}
        >
          <span className="inline-flex size-[34px] shrink-0 items-center justify-center text-[#F5F4FB]">
            <Grid3X3 className="size-5" strokeWidth={2} />
          </span>
          <span className="flex-1 text-[15px] font-bold text-[#F5F4FB]">Guides & grid</span>
          <span
            className="inline-flex h-[26px] w-11 shrink-0 rounded-full border p-0.5 transition-colors duration-160"
            style={{
              background: showGrid ? UI_COLORS.ACCENT : UI_COLORS.SURFACE_HOVER,
              borderColor: showGrid ? UI_COLORS.ACCENT : UI_COLORS.BORDER_HOVER,
              justifyContent: showGrid ? "flex-end" : "flex-start",
            }}
          >
            <span className="size-5 rounded-full bg-white" />
          </span>
        </button>
      ) : null}
    </div>
  );
}

export function getAdvancedMobileScreenTitle(screen: AdvancedScreen | null): string | null {
  if (!screen) return null;
  return SCREEN_META[screen]?.label ?? null;
}

export function getAdvancedMobileScreenIcon(screen: AdvancedScreen | null): ReactNode | null {
  if (!screen) return null;
  return SCREEN_META[screen]?.icon ?? null;
}

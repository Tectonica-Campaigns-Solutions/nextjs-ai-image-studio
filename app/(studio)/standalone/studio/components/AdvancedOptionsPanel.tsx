"use client";

import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  Grid3X3,
  ImageIcon,
  Layers,
  Save,
  Shapes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STUDIO_ADVANCED_ROWS } from "../constants/editor-constants";
import { FrameItem } from "./editor-icons";
import { StudioAdvancedPanelBody } from "./studio-ui";

export interface AdvancedOptionsPanelProps {
  layersToolsPanel: ReactNode | null;
  backgroundImagePanel: ReactNode | null;
  shapeToolsPanel: ReactNode | null;
  frameToolsPanel: ReactNode | null;
  guidesAndGridPanel: ReactNode | null;
  sessionsListPanel: ReactNode | null;
}

type AdvancedRowId = (typeof STUDIO_ADVANCED_ROWS)[number]["id"];

const ROW_ICONS: Record<AdvancedRowId, ReactNode> = {
  layers: <Layers strokeWidth={2} className="size-5" />,
  background: <ImageIcon strokeWidth={2} className="size-5" />,
  shapes: <Shapes strokeWidth={2} className="size-5" />,
  frames: <FrameItem />,
  guides: <Grid3X3 strokeWidth={2} className="size-5" />,
  sessions: <Save strokeWidth={2} className="size-5" />,
};

function AdvancedRow({
  id,
  label,
  bordered,
  open,
  onToggle,
  children,
}: {
  id: AdvancedRowId;
  label: string;
  bordered: boolean;
  open: boolean;
  onToggle: (id: AdvancedRowId) => void;
  children: ReactNode;
}) {
  return (
    <div className={cn(bordered && "border-t border-white/[0.09]")}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full cursor-pointer items-center gap-[13px] px-1 py-[14px] text-left transition-colors hover:bg-white/[0.02]"
        aria-expanded={open}
      >
        <span className="inline-flex size-10 shrink-0 items-center justify-center text-[#F5F4FB] [&_svg]:size-5">
          {ROW_ICONS[id]}
        </span>
        <span className="min-w-0 flex-1 text-[15px] font-bold text-[#F5F4FB]">{label}</span>
        <ChevronDown
          className={cn(
            "size-[18px] shrink-0 text-[#ADAAC0] transition-transform duration-160",
            open && "rotate-180",
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open ? (
        <StudioAdvancedPanelBody>{children}</StudioAdvancedPanelBody>
      ) : null}
    </div>
  );
}

export function AdvancedOptionsPanel({
  layersToolsPanel,
  backgroundImagePanel,
  shapeToolsPanel,
  frameToolsPanel,
  guidesAndGridPanel,
  sessionsListPanel,
}: AdvancedOptionsPanelProps) {
  const [openId, setOpenId] = useState<AdvancedRowId | null>(null);

  const contentById: Record<AdvancedRowId, ReactNode | null> = {
    layers: layersToolsPanel,
    background: backgroundImagePanel,
    shapes: shapeToolsPanel,
    frames: frameToolsPanel,
    guides: guidesAndGridPanel,
    sessions: sessionsListPanel,
  };

  const rows = STUDIO_ADVANCED_ROWS.filter((row) => contentById[row.id] != null);

  if (rows.length === 0) return null;

  const handleToggle = (id: AdvancedRowId) => {
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <div className="flex flex-col">
      {rows.map((row, index) => (
        <AdvancedRow
          key={row.id}
          id={row.id}
          label={row.label}
          bordered={index > 0}
          open={openId === row.id}
          onToggle={handleToggle}
        >
          {contentById[row.id]}
        </AdvancedRow>
      ))}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import {
  History,
  QrCode,
  SlidersHorizontal,
  Stamp,
  Type,
  WandSparkles,
} from "lucide-react";
import { StudioPanelHeader } from "./studio-ui";
import { UI_COLORS } from "../constants/editor-constants";
import type { StudioDesktopToolId } from "../constants/editor-constants";

const META: Record<
  StudioDesktopToolId,
  { label: string; icon: ReactNode }
> = {
  "text-tools": { label: "Text Tools", icon: <Type className="size-[18px]" /> },
  "logo-overlay": { label: "Logo Overlay", icon: <Stamp className="size-[18px]" /> },
  "qr-code": { label: "QR Code", icon: <QrCode className="size-[18px]" /> },
  "ai-edit": { label: "Edit with AI", icon: <WandSparkles className="size-[18px]" /> },
  "advanced-options": { label: "Advanced", icon: <SlidersHorizontal className="size-[18px]" /> },
  "saved-versions": { label: "Saved versions", icon: <History className="size-[18px]" /> },
};

export function StudioDesktopToolPanel({
  tool,
  onClose,
  textToolsPanel,
  logoToolsPanel,
  qrToolsPanel,
  aiEditPanel,
  advancedContent,
  sessionsListPanel,
}: {
  tool: StudioDesktopToolId;
  onClose: () => void;
  textToolsPanel: ReactNode | null;
  logoToolsPanel: ReactNode | null;
  qrToolsPanel: ReactNode | null;
  aiEditPanel: ReactNode | null;
  advancedContent: ReactNode | null;
  sessionsListPanel: ReactNode | null;
}) {
  const meta = META[tool];
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
      <StudioPanelHeader icon={meta.icon} title={meta.label} onClose={onClose} />
      {tool === "text-tools" && textToolsPanel}
      {tool === "logo-overlay" && logoToolsPanel}
      {tool === "qr-code" && qrToolsPanel}
      {tool === "ai-edit" && aiEditPanel}
      {tool === "advanced-options" && advancedContent}
      {tool === "saved-versions" && sessionsListPanel}
    </div>
  );
}

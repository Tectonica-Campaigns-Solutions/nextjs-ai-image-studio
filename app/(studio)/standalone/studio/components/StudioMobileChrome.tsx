"use client";

import type { ReactNode } from "react";
import {
  Download,
  History,
  ImagePlus,
  Loader2,
  MessageSquareShare,
  QrCode,
  SlidersHorizontal,
  Sparkles,
  Stamp,
  Trash2,
  Type,
  WandSparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STUDIO_MOBILE_TOOLS,
  UI_COLORS,
  type StudioMobileToolId,
} from "../constants/editor-constants";
import type { HistoryState } from "../types/image-editor-types";
import type { AlignOption } from "../hooks/use-alignment-tools";
import { AlignmentPopover } from "./AlignmentPopover";
import { FeedbackMobileTrigger } from "./FeedbackButton";
import { StudioIconButton } from "./studio-ui";

const TOOL_ICONS: Record<string, ReactNode> = {
  "text-tools": <Type className="size-[19px]" strokeWidth={2} />,
  "logo-overlay": <Stamp className="size-[19px]" strokeWidth={2} />,
  "qr-code": <QrCode className="size-[19px]" strokeWidth={2} />,
  "ai-edit": <WandSparkles className="size-[19px]" strokeWidth={2} />,
  "advanced-options": <SlidersHorizontal className="size-[19px]" strokeWidth={2} />,
  "saved-versions": <History className="size-[17px]" strokeWidth={2} />,
};

const TOOL_LABELS: Record<string, string> = {
  "text-tools": "Text Tools",
  "logo-overlay": "Logo Overlay",
  "qr-code": "QR Code",
  "ai-edit": "Edit with AI",
  "advanced-options": "Advanced",
  "saved-versions": "Saved versions",
};

const UndoIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 18 18" fill="none" className={className} aria-hidden>
    <path d="M1.62115 11.25C2.63914 14.4439 5.55463 16.75 8.99242 16.75C13.2768 16.75 16.75 13.1683 16.75 8.75C16.75 4.33172 13.2768 0.75 8.99242 0.75C6.12103 0.75 3.61399 2.35879 2.27267 4.75M4.62879 5.75H0.75V1.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RedoIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 18 18" fill="none" className={className} aria-hidden>
    <path d="M15.8788 11.25C14.8609 14.4439 11.9454 16.75 8.50758 16.75C4.22318 16.75 0.75 13.1683 0.75 8.75C0.75 4.33172 4.22318 0.75 8.50758 0.75C11.379 0.75 13.886 2.35879 15.2273 4.75M12.8712 5.75H16.75V1.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SaveOutlineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
    <path d="M7 3v4a1 1 0 0 0 1 1h7" />
  </svg>
);

function MobileIconBtn({
  label,
  onClick,
  disabled,
  danger,
  active,
  badge,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  badge?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border transition-colors duration-160 disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? active
            ? "border-[#F26B81] bg-[rgba(242,107,129,0.15)] text-[#F26B81]"
            : "border-[rgba(242,107,129,0.4)] bg-[rgba(242,107,129,0.15)] text-[#F26B81]"
          : active
            ? "border-[#8069FF] bg-[rgba(128,105,255,0.16)] text-[#8069FF]"
            : "border-white/[0.09] bg-[#211E30] text-[#F5F4FB]",
      )}
    >
      {children}
      {badge ? (
        <span
          className={cn(
            "absolute top-[5px] right-[5px] size-[7px] rounded-full",
            active ? "bg-white shadow-[0_0_0_2px_#6146F2]" : "bg-[#8069FF] shadow-[0_0_0_2px_#211E30]",
          )}
        />
      ) : null}
    </button>
  );
}

export function StudioMobileHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header
      className="flex shrink-0 items-center gap-[11px] px-4 pb-1.5 pt-3 md:hidden"
      style={{ background: UI_COLORS.CANVAS_MAT, color: UI_COLORS.TEXT_PRIMARY }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[15.5px] font-bold tracking-[-0.01em]">Visual Studio</div>
        <div className="text-[12px] font-semibold" style={{ color: UI_COLORS.TEXT_SECONDARY }}>
          {subtitle ?? "Editing"}
        </div>
      </div>
    </header>
  );
}

export function StudioMobileCanvasControls({
  undo,
  redo,
  deleteSelected,
  onAlign,
  historyState,
  selectedObject,
  onHistoryClick,
  historyBadge,
}: {
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
  onAlign?: (option: AlignOption) => void;
  historyState: HistoryState;
  selectedObject: unknown;
  onHistoryClick?: () => void;
  historyBadge?: boolean;
}) {
  const undoDisabled = historyState.currentIndex <= 0;
  const redoDisabled = historyState.currentIndex >= historyState.entries.length - 1;

  return (
    <div
      className="absolute bottom-[calc(100%+8px)] left-1/2 z-[4] flex -translate-x-1/2 items-center gap-[3px] rounded-xl border border-white/[0.09] p-[5px] backdrop-blur-md md:hidden"
      style={{ background: "rgba(14,13,24,0.72)" }}
    >
      <MobileIconBtn label="Undo" onClick={undo} disabled={undoDisabled}>
        <UndoIcon />
      </MobileIconBtn>
      <MobileIconBtn label="Redo" onClick={redo} disabled={redoDisabled}>
        <RedoIcon />
      </MobileIconBtn>
      {onAlign ? (
        <AlignmentPopover
          onAlign={onAlign}
          selectedObject={selectedObject}
          variant="mobile"
          compact
        />
      ) : null}
      {onHistoryClick ? (
        <MobileIconBtn label="Saved versions" onClick={onHistoryClick} badge={historyBadge}>
          <History className="size-[17px]" strokeWidth={2} />
        </MobileIconBtn>
      ) : null}
      <span className="mx-1.5 h-4 w-px bg-white/[0.17]" />
      <MobileIconBtn
        label="Delete selection"
        onClick={deleteSelected}
        disabled={!selectedObject}
        danger
      >
        <Trash2 className="size-[17px]" strokeWidth={2} />
      </MobileIconBtn>
    </div>
  );
}

export function StudioMobileTabBar({
  activeTab,
  onTabClick,
  availableTools,
}: {
  activeTab: string | null;
  onTabClick: (tabId: string) => void;
  availableTools: string[];
}) {
  const tools = STUDIO_MOBILE_TOOLS.filter((t) => availableTools.includes(t.id));

  return (
    <nav
      className="grid shrink-0 gap-1 px-2 pb-1.5 pt-2 md:hidden"
      style={{
        gridTemplateColumns: `repeat(${tools.length}, minmax(0, 1fr))`,
        background: UI_COLORS.CANVAS_MAT,
        borderTop: `1px solid ${UI_COLORS.BORDER}`,
      }}
    >
      {tools.map((t) => {
        const active = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            title={t.label}
            onClick={() => onTabClick(t.id)}
            className="flex min-w-0 cursor-pointer flex-col items-center gap-[5px] px-0 py-1"
          >
            <span
              className="inline-flex size-10 items-center justify-center rounded-xl transition-colors duration-160"
              style={{
                background: active ? UI_COLORS.ACCENT_DEEP : "transparent",
                color: active ? "#fff" : UI_COLORS.TEXT_PRIMARY,
              }}
            >
              {TOOL_ICONS[t.id]}
            </span>
            <span
              className="text-[10.5px] font-bold tracking-[-0.01em] whitespace-nowrap"
              style={{ color: active ? UI_COLORS.TEXT_PRIMARY : UI_COLORS.TEXT_SECONDARY }}
            >
              {t.short}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function StudioMobileSessionBar({
  handleExportClick,
  isExporting,
  showSaveButton,
  onSaveClick,
  isSaving,
  onSendUrlToChat,
  isSendingUrl,
  onFeedbackPress,
  isFetchingFeedback,
  feedbackOpen,
}: {
  handleExportClick: () => void;
  isExporting: boolean;
  showSaveButton?: boolean;
  onSaveClick?: () => void;
  isSaving: boolean;
  onSendUrlToChat?: () => void;
  isSendingUrl?: boolean;
  onFeedbackPress?: () => void;
  isFetchingFeedback?: boolean;
  feedbackOpen?: boolean;
}) {
  const iconBtn = (
    label: string,
    icon: ReactNode,
    onClick?: () => void,
    disabled?: boolean,
    ai?: boolean,
  ) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/[0.09] bg-[#211E30] text-[#F5F4FB] transition-colors duration-160 hover:bg-[#2C2942] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span style={ai ? { color: "#B06BE6" } : undefined}>{icon}</span>
    </button>
  );

  return (
    <div
      className="flex shrink-0 items-center gap-[7px] px-3 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden"
      style={{ background: UI_COLORS.PRIMARY_BG, borderTop: `1px solid ${UI_COLORS.BORDER}` }}
    >
      <button
        type="button"
        onClick={handleExportClick}
        disabled={isExporting}
        className="inline-flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl text-[14.5px] font-bold tracking-[-0.01em] text-white transition-colors duration-160 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: UI_COLORS.ACCENT_DEEP }}
      >
        {isExporting ? (
          <Loader2 className="size-[19px] animate-spin" />
        ) : (
          <Download className="size-[19px]" strokeWidth={2.2} />
        )}
        {isExporting ? "Exporting..." : "Download"}
      </button>

      {showSaveButton && onSaveClick
        ? iconBtn(
            "Save project",
            isSaving ? <Loader2 className="size-[19px] animate-spin" /> : <SaveOutlineIcon />,
            onSaveClick,
            isSaving,
          )
        : null}

      {iconBtn("Save to Media", <ImagePlus className="size-[19px]" strokeWidth={2.1} />, undefined, true)}

      {onSendUrlToChat
        ? iconBtn(
            "Send to chat",
            isSendingUrl ? (
              <Loader2 className="size-[19px] animate-spin" />
            ) : (
              <MessageSquareShare className="size-[19px]" strokeWidth={2.1} />
            ),
            onSendUrlToChat,
            isSendingUrl,
          )
        : null}

      {onFeedbackPress ? (
        <FeedbackMobileTrigger
          onPress={onFeedbackPress}
          isFetchingFeedback={isFetchingFeedback ?? false}
          isOpen={feedbackOpen ?? false}
        />
      ) : (
        iconBtn("Get Feedback", <Sparkles className="size-[19px]" strokeWidth={2.1} />, undefined, true, true)
      )}
    </div>
  );
}

export function StudioMobileToolSheet({
  activeTab,
  panelTitle,
  panelSubtitle,
  panelIcon,
  onClose,
  children,
  panelRef,
  onDragStart,
  onDragMove,
  onDragEnd,
  currentTranslateY,
}: {
  activeTab?: StudioMobileToolId | null;
  panelTitle?: string;
  panelSubtitle?: string;
  panelIcon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  panelRef?: React.RefObject<HTMLDivElement | null>;
  onDragStart?: (clientY: number) => void;
  onDragMove?: (clientY: number) => void;
  onDragEnd?: () => void;
  currentTranslateY?: number;
}) {
  if (!activeTab && !panelTitle) return null;

  const title = panelTitle ?? (activeTab ? TOOL_LABELS[activeTab] : undefined) ?? "Tools";
  const icon = panelIcon ?? (activeTab ? TOOL_ICONS[activeTab] : null);

  return (
    <aside
      ref={panelRef}
      className="vs-sheet-up absolute inset-x-0 bottom-0 z-[8] flex max-h-[86%] flex-col md:hidden"
      style={{
        background: UI_COLORS.PRIMARY_BG,
        borderTop: `1px solid ${UI_COLORS.BORDER}`,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        boxShadow: "0 -18px 40px -20px rgba(0,0,0,0.7)",
        transform: currentTranslateY ? `translateY(${currentTranslateY}px)` : undefined,
      }}
    >
      <div
        className="touch-none cursor-grab pt-2.5 active:cursor-grabbing"
        onMouseDown={(e) => onDragStart?.(e.clientY)}
        onMouseMove={(e) => onDragMove?.(e.clientY)}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={(e) => onDragStart?.(e.touches[0].clientY)}
        onTouchMove={(e) => onDragMove?.(e.touches[0].clientY)}
        onTouchEnd={onDragEnd}
      >
        <div className="flex justify-center">
          <div className="h-[5px] w-10 rounded-full bg-white/[0.17]" />
        </div>
      </div>

      <div className="flex items-center gap-2.5 px-4 pb-1 pt-2.5">
        <span
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] text-[#8069FF]"
          style={{ background: UI_COLORS.ACCENT_SOFT }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1 text-[15px] font-bold text-[#F5F4FB]">{title}</div>
        <StudioIconButton label="Close" onClick={onClose} className="size-9 rounded-[10px]">
          <X className="size-[17px]" strokeWidth={2} />
        </StudioIconButton>
      </div>

      {panelSubtitle ? (
        <p className="px-4 pb-1 text-[12px] font-semibold text-[#726F86]">{panelSubtitle}</p>
      ) : null}

      <div className="vs-noscroll themed-scrollbar flex-1 overflow-y-auto px-4 pb-[18px] pt-2.5">
        {children}
      </div>
    </aside>
  );
}

export function StudioMobileHomeSpacer() {
  return (
    <div
      className="h-5 shrink-0 md:hidden"
      style={{ background: UI_COLORS.PRIMARY_BG }}
    />
  );
}

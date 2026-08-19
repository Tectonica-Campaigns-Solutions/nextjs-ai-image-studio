"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_COLORS } from "../constants/editor-constants";
import {
  StudioActionButton,
  StudioIconButton,
  studioForm,
} from "./studio-ui";

export interface FeedbackIssue {
  id: string;
  title: string;
  severity: string;
  suggestion: string;
}

interface FeedbackButtonProps {
  handleGetFeedback: () => void;
  isFetchingFeedback: boolean;
  feedbackText: string | null;
  feedbackIssues?: FeedbackIssue[];
  feedbackEditPlan?: { prompt?: string } | null;
  handleApplyCleanup?: () => void;
  isApplyingCleanup?: boolean;
  /** "floating" = fixed bottom-right overlay (desktop). "inline" = normal flow (mobile toolbar). */
  variant?: "floating" | "inline";
}

const FEEDBACK_PANEL =
  "vs-pop relative flex w-[min(100vw-2rem,20rem)] flex-col overflow-hidden rounded-[14px] border border-white/[0.17] bg-[#211E30] text-[#F5F4FB] shadow-[0_24px_48px_-18px_rgba(0,0,0,0.75)]";

function severityDotClass(severity: string) {
  if (severity === "high") return "bg-[#F26B81]";
  if (severity === "medium") return "bg-[#FF9A54]";
  return "bg-[#54B978]";
}

export function FeedbackSparklesIcon() {
  return (
    <span
      className="inline-flex"
      style={{
        background: UI_COLORS.GRADIENT,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      <Sparkles className="size-[18px] text-[#B06BE6]" strokeWidth={2.2} aria-hidden />
    </span>
  );
}

export function FeedbackPanelContent({
  isFetchingFeedback,
  feedbackText,
  feedbackIssues,
  feedbackEditPlan,
  handleApplyCleanup,
  isApplyingCleanup,
  onRefresh,
  variant = "popover",
}: {
  isFetchingFeedback: boolean;
  feedbackText: string | null;
  feedbackIssues?: FeedbackIssue[];
  feedbackEditPlan?: { prompt?: string } | null;
  handleApplyCleanup?: () => void;
  isApplyingCleanup?: boolean;
  onRefresh?: () => void;
  variant?: "popover" | "sheet";
}) {
  const isSheet = variant === "sheet";

  if (isFetchingFeedback) {
    return (
      <div className={cn("space-y-2", isSheet ? "py-2" : "px-3.5 py-4")}>
        <div className="h-2.5 w-full animate-pulse rounded-full bg-white/[0.08]" />
        <div className="h-2.5 w-5/6 animate-pulse rounded-full bg-white/[0.08]" />
        <div className="h-2.5 w-4/6 animate-pulse rounded-full bg-white/[0.08]" />
        <div className="mt-3 h-2.5 w-full animate-pulse rounded-full bg-white/[0.08]" />
        <div className="h-2.5 w-3/4 animate-pulse rounded-full bg-white/[0.08]" />
      </div>
    );
  }

  if (!feedbackText) {
    return (
      <div className={cn(isSheet ? "py-2" : "px-3.5 py-4")}>
        <p className="text-[13px] leading-[1.65] text-[#ADAAC0]">
          Get AI suggestions to improve layout, contrast, and clarity on your canvas.
        </p>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className={cn(studioForm.primaryButton, "mt-4 h-11 w-full text-[14px]")}
          >
            <FeedbackSparklesIcon />
            Analyze canvas
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", !isSheet && "max-h-[60vh]")}>
      {onRefresh ? (
        <div className={cn("flex justify-end", isSheet ? "mb-3" : "border-b border-white/[0.09] px-3.5 py-2")}>
          <StudioIconButton label="Re-analyze current canvas" onClick={onRefresh}>
            <RefreshCw className="size-[18px]" strokeWidth={2} aria-hidden />
          </StudioIconButton>
        </div>
      ) : null}

      <div
        className={cn(
          "themed-scrollbar space-y-3 overflow-y-auto",
          isSheet ? "" : "px-3.5 py-3.5",
        )}
      >
        <p className="text-[13px] leading-[1.65] text-[#ADAAC0]">{feedbackText}</p>

        {feedbackEditPlan?.prompt ? (
          <div className="rounded-[10px] border border-white/[0.09] bg-[#141220] px-3 py-2.5">
            <div className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#726F86]">
              Suggested edit
            </div>
            <p className="text-[12.5px] leading-snug text-[#F5F4FB]">{feedbackEditPlan.prompt}</p>
          </div>
        ) : null}

        {Array.isArray(feedbackIssues) && feedbackIssues.length > 0 ? (
          <div className="border-t border-white/[0.09] pt-3">
            <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#726F86]">
              Top issues
            </div>
            <ul className="space-y-2.5">
              {feedbackIssues.slice(0, 4).map((issue) => (
                <li
                  key={issue.id}
                  className="rounded-[10px] border border-white/[0.09] bg-[#141220] px-3 py-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-1.5 inline-block size-2 shrink-0 rounded-full",
                        severityDotClass(issue.severity),
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-[#F5F4FB]">{issue.title}</div>
                      <div className="mt-0.5 text-[12.5px] leading-snug text-[#ADAAC0]">
                        {issue.suggestion}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {handleApplyCleanup ? (
        <div
          className={cn(
            "border-t border-white/[0.09]",
            isSheet ? "mt-4 pt-4" : "px-3.5 py-3",
          )}
        >
          <button
            type="button"
            onClick={handleApplyCleanup}
            disabled={isApplyingCleanup || isFetchingFeedback}
            className={cn(studioForm.primaryButton, "h-11 w-full text-[14px]")}
          >
            {isApplyingCleanup ? (
              <Loader2 className="size-[18px] animate-spin shrink-0" aria-hidden />
            ) : (
              <Wand2 className="size-[18px] shrink-0" strokeWidth={2.2} aria-hidden />
            )}
            {isApplyingCleanup ? "Applying cleanup..." : "Apply cleanup"}
          </button>
          <p className="mt-2 text-[12px] leading-snug text-[#726F86]">
            Applies a minimal polish pass and updates the canvas with the improved image.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Session bar trigger — toggles feedback drawer in parent */
export function FeedbackMobileTrigger({
  onPress,
  isFetchingFeedback,
  isOpen = false,
}: {
  onPress: () => void;
  isFetchingFeedback: boolean;
  isOpen?: boolean;
}) {
  const label = isFetchingFeedback
    ? "Analyzing..."
    : isOpen
      ? "Hide Feedback"
      : "Get Feedback";

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={isOpen}
      onClick={onPress}
      disabled={isFetchingFeedback && !isOpen}
      className={cn(
        "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border bg-[#211E30] text-[#F5F4FB] transition-colors duration-160 hover:bg-[#2C2942] disabled:cursor-not-allowed disabled:opacity-50",
        isOpen ? "border-[#8069FF] bg-[rgba(128,105,255,0.16)]" : "border-white/[0.09]",
      )}
    >
      {isFetchingFeedback ? (
        <Loader2 className="size-[19px] animate-spin text-[#B06BE6]" aria-hidden />
      ) : (
        <FeedbackSparklesIcon />
      )}
    </button>
  );
}

function FeedbackCore({
  handleGetFeedback,
  isFetchingFeedback,
  feedbackText,
  feedbackIssues,
  feedbackEditPlan,
  handleApplyCleanup,
  isApplyingCleanup,
  layout,
  compact = false,
}: {
  handleGetFeedback: () => void;
  isFetchingFeedback: boolean;
  feedbackText: string | null;
  feedbackIssues?: FeedbackIssue[];
  feedbackEditPlan?: { prompt?: string } | null;
  handleApplyCleanup?: () => void;
  isApplyingCleanup?: boolean;
  layout: "above" | "below" | "bar";
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedbackText) setOpen(true);
  }, [feedbackText]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const handleClick = () => {
    if (isFetchingFeedback) return;
    if (feedbackText || open) {
      setOpen((o) => !o);
    } else {
      handleGetFeedback();
    }
  };

  const handleRefresh = () => {
    if (isFetchingFeedback) return;
    setOpen(true);
    handleGetFeedback();
  };

  const showBubble = open || isFetchingFeedback;

  const buttonLabel = isFetchingFeedback
    ? "Analyzing..."
    : open
      ? "Hide Feedback"
      : feedbackText
        ? "Show Feedback"
        : "Get Feedback";

  const bubbleContent = (
    <div className={cn(FEEDBACK_PANEL, layout === "below" && "w-full max-w-none")}>
      <div className="flex items-center gap-2.5 border-b border-white/[0.09] px-3.5 py-3">
        <span
          className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: UI_COLORS.ACCENT_SOFT }}
        >
          <FeedbackSparklesIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-bold leading-tight text-[#F5F4FB]">Design feedback</div>
          <div className="mt-0.5 text-[11.5px] leading-snug text-[#726F86]">
            AI suggestions for your canvas
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {!isFetchingFeedback && feedbackText ? (
            <StudioIconButton label="Re-analyze current canvas" onClick={handleRefresh}>
              <RefreshCw className="size-[18px]" strokeWidth={2} aria-hidden />
            </StudioIconButton>
          ) : null}
          <StudioIconButton label="Close feedback" onClick={() => setOpen(false)}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </StudioIconButton>
        </div>
      </div>

      <FeedbackPanelContent
        isFetchingFeedback={isFetchingFeedback}
        feedbackText={feedbackText}
        feedbackIssues={feedbackIssues}
        feedbackEditPlan={feedbackEditPlan}
        handleApplyCleanup={handleApplyCleanup}
        isApplyingCleanup={isApplyingCleanup}
        variant="popover"
      />
    </div>
  );

  const triggerButton =
    layout === "bar" || layout === "below" ? (
      <StudioActionButton
        label={buttonLabel}
        variant="ai"
        iconOnly={layout === "bar" && compact}
        onClick={handleClick}
        disabled={isFetchingFeedback}
        icon={
          isFetchingFeedback ? (
            <Loader2 className="size-[18px] animate-spin shrink-0 text-[#B06BE6]" aria-hidden />
          ) : (
            <FeedbackSparklesIcon />
          )
        }
        className={layout === "below" ? "w-full" : undefined}
      >
        {buttonLabel}
      </StudioActionButton>
    ) : (
      <StudioActionButton
        label={buttonLabel}
        variant="ai"
        onClick={handleClick}
        disabled={isFetchingFeedback}
        icon={
          isFetchingFeedback ? (
            <Loader2 className="size-[18px] animate-spin shrink-0 text-[#B06BE6]" aria-hidden />
          ) : (
            <FeedbackSparklesIcon />
          )
        }
      >
        {buttonLabel}
      </StudioActionButton>
    );

  if (layout === "bar") {
    return (
      <div ref={containerRef} className="relative">
        {showBubble ? (
          <div className="absolute bottom-[calc(100%+12px)] left-0 z-50">{bubbleContent}</div>
        ) : null}
        {triggerButton}
      </div>
    );
  }

  if (layout === "above") {
    return (
      <div ref={containerRef} className="flex flex-col items-end gap-3">
        {showBubble ? bubbleContent : null}
        {triggerButton}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col items-stretch gap-3">
      {triggerButton}
      {showBubble ? bubbleContent : null}
    </div>
  );
}

/** Floating fixed overlay — desktop only (hidden on mobile) */
export function FeedbackButton({
  handleGetFeedback,
  isFetchingFeedback,
  feedbackText,
  feedbackIssues,
  feedbackEditPlan,
  handleApplyCleanup,
  isApplyingCleanup,
}: Omit<FeedbackButtonProps, "variant">) {
  return (
    <div className="fixed bottom-6 right-6 z-50 hidden md:block">
      <FeedbackCore
        handleGetFeedback={handleGetFeedback}
        isFetchingFeedback={isFetchingFeedback}
        feedbackText={feedbackText}
        feedbackIssues={feedbackIssues}
        feedbackEditPlan={feedbackEditPlan}
        handleApplyCleanup={handleApplyCleanup}
        isApplyingCleanup={isApplyingCleanup}
        layout="above"
      />
    </div>
  );
}

/** Inline variant for embedding inside the mobile toolbar */
export function FeedbackButtonInline({
  handleGetFeedback,
  isFetchingFeedback,
  feedbackText,
  feedbackIssues,
  feedbackEditPlan,
  handleApplyCleanup,
  isApplyingCleanup,
}: Omit<FeedbackButtonProps, "variant">) {
  return (
    <FeedbackCore
      handleGetFeedback={handleGetFeedback}
      isFetchingFeedback={isFetchingFeedback}
      feedbackText={feedbackText}
      feedbackIssues={feedbackIssues}
      feedbackEditPlan={feedbackEditPlan}
      handleApplyCleanup={handleApplyCleanup}
      isApplyingCleanup={isApplyingCleanup}
      layout="below"
    />
  );
}

/** Action-bar variant matching the Visual Studio desktop chrome */
export function FeedbackButtonBar({
  compact = false,
  handleGetFeedback,
  isFetchingFeedback,
  feedbackText,
  feedbackIssues,
  feedbackEditPlan,
  handleApplyCleanup,
  isApplyingCleanup,
}: Omit<FeedbackButtonProps, "variant"> & { compact?: boolean }) {
  return (
    <FeedbackCore
      handleGetFeedback={handleGetFeedback}
      isFetchingFeedback={isFetchingFeedback}
      feedbackText={feedbackText}
      feedbackIssues={feedbackIssues}
      feedbackEditPlan={feedbackEditPlan}
      handleApplyCleanup={handleApplyCleanup}
      isApplyingCleanup={isApplyingCleanup}
      layout="bar"
      compact={compact}
    />
  );
}

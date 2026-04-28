"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, RefreshCw, Sparkles, Wand2, X } from "lucide-react";

interface FeedbackButtonProps {
  handleGetFeedback: () => void;
  isFetchingFeedback: boolean;
  feedbackText: string | null;
  feedbackIssues?: Array<{ id: string; title: string; severity: string; suggestion: string }>;
  feedbackEditPlan?: { prompt?: string } | null;
  handleApplyCleanup?: () => void;
  isApplyingCleanup?: boolean;
  /** "floating" = fixed bottom-right overlay (desktop). "inline" = normal flow (mobile toolbar). */
  variant?: "floating" | "inline";
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
}: {
  handleGetFeedback: () => void;
  isFetchingFeedback: boolean;
  feedbackText: string | null;
  feedbackIssues?: Array<{ id: string; title: string; severity: string; suggestion: string }>;
  feedbackEditPlan?: { prompt?: string } | null;
  handleApplyCleanup?: () => void;
  isApplyingCleanup?: boolean;
  /** "above" = bubble above button, right-aligned (desktop floating).
   *  "below" = bubble below button, full-width button (mobile inline). */
  layout: "above" | "below";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-open bubble whenever fresh feedback arrives
  useEffect(() => {
    if (feedbackText) setOpen(true);
  }, [feedbackText]);

  // Close when clicking outside
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

  const bubbleContent = (
    <div
      className={`relative rounded-2xl text-sm text-white shadow-2xl ${layout === "below" ? "w-full" : "w-72"} flex flex-col`}
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
        border: "1px solid rgba(167,139,250,0.3)",
        boxShadow: "0 0 24px rgba(124,58,237,0.25), 0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {/* Arrow pointing UP toward button (only for "below" layout) */}
      {layout === "below" && (
        <div
          className="absolute -top-[9px] left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
          style={{
            background: "linear-gradient(315deg, transparent 50%, #1a1a2e 50%)",
            borderLeft: "1px solid rgba(167,139,250,0.3)",
            borderTop: "1px solid rgba(167,139,250,0.3)",
          }}
        />
      )}

      {/* Header row */}
      <div className="flex items-center gap-2 px-4 pt-4 mb-2.5 pr-10">
        <Sparkles className="w-4 h-4 text-[#a78bfa] shrink-0" />
        <span className="font-semibold text-[#a78bfa] text-[13px] tracking-wide uppercase flex-1">
          AI Design Feedback
        </span>
        {!isFetchingFeedback && feedbackText && (
          <button
            onClick={handleRefresh}
            className="text-white/40 hover:text-[#a78bfa] transition-colors cursor-pointer"
            aria-label="Refresh feedback"
            title="Re-analyze current canvas"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => setOpen(false)}
        className="absolute top-2.5 right-2.5 text-white/40 hover:text-white/80 transition-colors cursor-pointer"
        aria-label="Close feedback"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Body */}
      {isFetchingFeedback ? (
        <div className="space-y-2 mt-1 px-4 pb-4">
          <div className="h-3 rounded-full bg-white/10 animate-pulse w-full" />
          <div className="h-3 rounded-full bg-white/10 animate-pulse w-5/6" />
          <div className="h-3 rounded-full bg-white/10 animate-pulse w-4/6" />
          <div className="h-3 rounded-full bg-white/10 animate-pulse w-full mt-3" />
          <div className="h-3 rounded-full bg-white/10 animate-pulse w-3/4" />
        </div>
      ) : (
        <div className="max-h-[60vh] flex flex-col">
          <div className="px-4 pb-4 overflow-y-auto space-y-3 pr-3">
            <p className="text-white/85 leading-[1.65]">{feedbackText}</p>

            {Array.isArray(feedbackIssues) && feedbackIssues.length > 0 && (
              <div className="pt-2 border-t border-white/10">
                <div className="text-[12px] font-semibold tracking-wide uppercase text-white/60 mb-2">
                  Top issues
                </div>
                <ul className="space-y-2">
                  {feedbackIssues.slice(0, 4).map((issue) => (
                    <li key={issue.id} className="text-white/80 leading-snug">
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-[3px] inline-block size-2 rounded-full ${
                            issue.severity === "high"
                              ? "bg-red-400"
                              : issue.severity === "medium"
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                          }`}
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-white/90">{issue.title}</div>
                          <div className="text-white/70">{issue.suggestion}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {handleApplyCleanup && (
            <div
              className="px-4 py-3 border-t border-white/10"
              style={{
                background:
                  "linear-gradient(180deg, rgba(26,26,46,0.55) 0%, rgba(15,52,96,0.85) 100%)",
              }}
            >
              <button
                onClick={handleApplyCleanup}
                disabled={isApplyingCleanup || isFetchingFeedback}
                className="w-full flex items-center justify-center gap-2 h-[42px] rounded-[10px] font-semibold text-[14px] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #22c55e 45%, #34d399 100%)",
                  boxShadow: "0 0 0 2px rgba(16,185,129,0.25), 0 6px 20px rgba(16,185,129,0.25)",
                }}
                aria-label="Apply AI cleanup"
                title="Apply AI cleanup to the canvas (flattens result)"
              >
                {isApplyingCleanup ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Wand2 className="w-4 h-4 shrink-0" />
                )}
                <span>
                  {isApplyingCleanup
                    ? "Applying cleanup..."
                    : "Apply cleanup"}
                </span>
              </button>
              <div className="mt-2 text-[12px] text-white/55 leading-snug">
                Applies a minimal polish pass and updates the canvas with the improved image.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Arrow pointing DOWN toward button (only for "above" layout) */}
      {layout === "above" && (
        <div
          className="absolute -bottom-[9px] right-[22px] w-4 h-4 rotate-45"
          style={{
            background: "linear-gradient(135deg, transparent 50%, #0f3460 50%)",
            borderRight: "1px solid rgba(167,139,250,0.3)",
            borderBottom: "1px solid rgba(167,139,250,0.3)",
          }}
        />
      )}
    </div>
  );

  const pillButton = (
    <button
      onClick={handleClick}
      disabled={isFetchingFeedback}
      aria-label="Get AI feedback"
      className={`relative flex items-center justify-center gap-2 px-4 h-[44px] rounded-[10px] text-white text-[15px] font-semibold cursor-pointer disabled:cursor-not-allowed select-none overflow-hidden transition-transform duration-200 hover:scale-105 active:scale-95 disabled:hover:scale-100 ${layout === "below" ? "w-full" : "rounded-full h-[46px]"}`}
      style={{
        background: "linear-gradient(135deg, #5C38F3 0%, #7c3aed 50%, #a855f7 100%)",
        boxShadow: "0 0 0 2px rgba(124,58,237,0.4), 0 4px 20px rgba(124,58,237,0.5)",
      }}
    >
      {/* Animated shimmer border */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: "inherit",
          background:
            "conic-gradient(from 0deg, transparent 0%, #a78bfa 25%, transparent 50%, #7c3aed 75%, transparent 100%)",
          opacity: isFetchingFeedback ? 0.9 : 0.6,
          animation: "spin 3s linear infinite",
          padding: "1.5px",
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      {isFetchingFeedback ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        <Sparkles className="w-4 h-4 shrink-0" />
      )}
      <span>
        {isFetchingFeedback
          ? "Analyzing..."
          : open
          ? "Hide Feedback"
          : feedbackText
          ? "Show Feedback"
          : "Get Feedback"}
      </span>
    </button>
  );

  if (layout === "above") {
    return (
      <div ref={containerRef} className="flex flex-col items-end gap-3">
        {showBubble && bubbleContent}
        {pillButton}
      </div>
    );
  }

  // "below" — bubble opens below the full-width button
  return (
    <div ref={containerRef} className="flex flex-col items-stretch gap-3">
      {pillButton}
      {showBubble && bubbleContent}
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

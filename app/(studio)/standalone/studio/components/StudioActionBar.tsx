"use client";

import { Download, ImagePlus, Loader2, MessageSquareShare, Save, Sparkles } from "lucide-react";
import { StudioActionButton } from "./studio-ui";
import { UI_COLORS } from "../constants/editor-constants";
import { FeedbackButtonBar } from "./FeedbackButton";

export interface StudioActionBarProps {
  compact?: boolean;
  handleExportClick: () => void;
  isExporting: boolean;
  showSaveButton?: boolean;
  onSaveClick?: () => void;
  isSaving: boolean;
  onSendUrlToChat?: () => void;
  isSendingUrl?: boolean;
  handleGetFeedback?: () => void;
  isFetchingFeedback?: boolean;
  feedbackText?: string | null;
  feedbackIssues?: Array<{ id: string; title: string; severity: string; suggestion: string }>;
  feedbackEditPlan?: { tool?: string; prompt?: string } | null;
  handleApplyCleanup?: () => void;
  isApplyingCleanup?: boolean;
}

export function StudioActionBar({
  compact,
  handleExportClick,
  isExporting,
  showSaveButton,
  onSaveClick,
  isSaving,
  onSendUrlToChat,
  isSendingUrl,
  handleGetFeedback,
  isFetchingFeedback = false,
  feedbackText = null,
  feedbackIssues = [],
  feedbackEditPlan = null,
  handleApplyCleanup,
  isApplyingCleanup = false,
}: StudioActionBarProps) {
  return (
    <div
      className="hidden md:flex shrink-0 items-center gap-2.5 border-t px-[18px] py-[14px]"
      style={{ background: UI_COLORS.PRIMARY_BG, borderColor: UI_COLORS.BORDER }}
    >
      {handleGetFeedback ? (
        <FeedbackButtonBar
          compact={compact}
          handleGetFeedback={handleGetFeedback}
          isFetchingFeedback={isFetchingFeedback}
          feedbackText={feedbackText}
          feedbackIssues={feedbackIssues}
          feedbackEditPlan={feedbackEditPlan}
          handleApplyCleanup={handleApplyCleanup}
          isApplyingCleanup={isApplyingCleanup}
        />
      ) : (
        <StudioActionButton
          label="Get Feedback"
          variant="ai"
          iconOnly={compact}
          icon={
            <span
              className="inline-flex"
              style={{
                background: UI_COLORS.GRADIENT,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              <Sparkles className="size-[18px] text-[#B06BE6]" strokeWidth={2.2} />
            </span>
          }
          disabled
        >
          Get Feedback
        </StudioActionButton>
      )}

      <div className="flex-1" />

      {showSaveButton ? (
        <StudioActionButton
          label="Save version"
          variant="ghost"
          iconOnly={compact}
          onClick={onSaveClick}
          disabled={isSaving}
          icon={isSaving ? <Loader2 className="size-[18px] animate-spin" /> : <Save className="size-[18px]" strokeWidth={2.2} />}
        >
          Save version
        </StudioActionButton>
      ) : null}

      <StudioActionButton
        label="Save to Media"
        variant="ghost"
        iconOnly={compact}
        disabled
        icon={<ImagePlus className="size-[18px]" strokeWidth={2.2} />}
      >
        Save to Media
      </StudioActionButton>

      {onSendUrlToChat ? (
        <StudioActionButton
          label="Send to chat"
          variant="ghost"
          iconOnly={compact}
          onClick={onSendUrlToChat}
          disabled={isSendingUrl}
          icon={
            isSendingUrl ? (
              <Loader2 className="size-[18px] animate-spin" />
            ) : (
              <MessageSquareShare className="size-[18px]" strokeWidth={2.2} />
            )
          }
        >
          Send to chat
        </StudioActionButton>
      ) : null}

      <StudioActionButton
        label="Download"
        variant="primary"
        onClick={handleExportClick}
        disabled={isExporting}
        icon={isExporting ? <Loader2 className="size-[18px] animate-spin" /> : <Download className="size-[18px]" strokeWidth={2.2} />}
      >
        {isExporting ? "Exporting..." : "Download"}
      </StudioActionButton>
    </div>
  );
}

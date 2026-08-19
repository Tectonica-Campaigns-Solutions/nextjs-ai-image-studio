"use client";

import { useCallback, useState } from "react";
import { CircleDot, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudioPanelHint } from "./studio-ui";

export interface SessionSummary {
  id: string;
  name: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionsListPanelProps {
  sessions: SessionSummary[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void | Promise<void>;
  isLoading: boolean;
}

function formatMeta(dateStr: string, isCurrent: boolean) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (isCurrent && diffMins < 60) {
    if (diffMins < 1) return "Autosaved · Just now";
    if (diffMins === 1) return "Autosaved · 1 min ago";
    return `Autosaved · ${diffMins} min ago`;
  }

  const time = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return `Saved by you · Today, ${time}`;
  if (isYesterday) return `Saved by you · Yesterday, ${time}`;

  const day = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(date);

  return `Saved by you · ${day}, ${time}`;
}

function sessionLabel(session: SessionSummary, isCurrent: boolean) {
  const name = session.name?.trim();
  if (name) return name;
  return isCurrent ? "Current draft" : "Untitled";
}

export function SessionsListPanel({
  sessions,
  currentSessionId,
  onSelectSession,
  isLoading,
}: SessionsListPanelProps) {
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);

  const handleRestore = useCallback(
    async (sessionId: string) => {
      if (loadingSessionId) return;
      setLoadingSessionId(sessionId);
      try {
        await onSelectSession(sessionId);
      } finally {
        setLoadingSessionId(null);
      }
    },
    [onSelectSession, loadingSessionId],
  );

  if (isLoading) {
    return <StudioPanelHint>Loading saved versions…</StudioPanelHint>;
  }

  if (!sessions.length) {
    return <StudioPanelHint>No saved versions for this image.</StudioPanelHint>;
  }

  return (
    <div className="flex flex-col" role="list">
      {sessions.map((session, index) => {
        const isCurrent = session.id === currentSessionId;
        const isLoadingThis = loadingSessionId === session.id;

        return (
          <div
            key={session.id}
            role="listitem"
            className={cn(
              "flex items-center gap-3 px-1 py-[13px]",
              index > 0 && "border-t border-white/[0.09]",
            )}
          >
            <span
              className={cn(
                "inline-flex size-[34px] shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-[#211E30]",
                isCurrent
                  ? "border-[#8069FF] text-[#8069FF]"
                  : "border-white/[0.09] text-[#726F86]",
              )}
            >
              {isCurrent ? (
                <CircleDot className="size-4" strokeWidth={2} aria-hidden />
              ) : session.thumbnail_url ? (
                <img
                  src={session.thumbnail_url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <ImageIcon className="size-4" strokeWidth={2} aria-hidden />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-bold text-[#F5F4FB]">
                {sessionLabel(session, isCurrent)}
              </div>
              <div className="mt-0.5 text-[11.5px] text-[#726F86]">
                {formatMeta(session.updated_at, isCurrent)}
              </div>
            </div>

            {!isCurrent ? (
              <button
                type="button"
                onClick={() => handleRestore(session.id)}
                disabled={!!loadingSessionId}
                className={cn(
                  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/[0.17] px-2.5 py-1.5 text-[12.5px] font-bold text-[#8069FF] transition-colors",
                  "hover:bg-[rgba(128,105,255,0.08)] disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {isLoadingThis ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  "Restore"
                )}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

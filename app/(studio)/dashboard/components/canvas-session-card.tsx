"use client";

import type { CanvasSessionSummary } from "@/app/(studio)/dashboard/utils/types";
import { DashboardMaterialIcon } from "./DashboardMaterialIcon";

interface CanvasSessionCardProps {
  session: CanvasSessionSummary;
  fallbackIcon: string;
  createdLabel: string;
  manageHref?: string;
  previewUrl?: string | null;
  deleteDisabled?: boolean;
  onDelete: () => void;
}

export function CanvasSessionCard({
  session,
  fallbackIcon,
  createdLabel,
  manageHref,
  previewUrl,
  deleteDisabled = false,
  onDelete,
}: CanvasSessionCardProps) {
  const openHref = `/standalone/studio?session_id=${encodeURIComponent(
    session.id,
  )}&user_id=${encodeURIComponent(session.ca_user_id)}`;

  const effectivePreviewUrl = previewUrl ?? session.thumbnail_url;

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-dashboard-primary/10 flex items-center justify-center text-dashboard-primary shrink-0 overflow-hidden">
          {effectivePreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={effectivePreviewUrl}
              alt={session.name ?? "Canvas session"}
              className="w-full h-full object-cover"
            />
          ) : (
            <DashboardMaterialIcon icon={fallbackIcon} />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-on-surface truncate">
            {session.name ?? "Untitled Session"}
          </p>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-medium mt-1">
            Created {createdLabel}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {manageHref ? (
          <a
            href={manageHref}
            className="bg-surface-container-low text-on-surface px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-surface-container-high"
          >
            Manage
          </a>
        ) : null}
        <button
          type="button"
          onClick={onDelete}
          disabled={deleteDisabled}
          className="bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-destructive/90 disabled:opacity-50"
        >
          Delete
        </button>
        <a
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-dashboard-primary text-dashboard-on-primary px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:opacity-90"
        >
          Open
        </a>
      </div>
    </div>
  );
}

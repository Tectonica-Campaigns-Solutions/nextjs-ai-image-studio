"use client";

import React, { useMemo, useState } from "react";
import type { CanvasSessionSummary } from "@/app/(studio)/dashboard/utils/types";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { deleteCanvasSessionAction } from "@/app/(studio)/dashboard/features/canvas-sessions/actions/canvas-sessions";
import { formatRelativeFromNow } from "@/app/(studio)/dashboard/utils/date-formatters";
import { useServerAction } from "@/app/(studio)/dashboard/hooks/use-server-action";
import { ConfirmDialog } from "@/app/(studio)/dashboard/components/confirm-dialog";
import { CanvasSessionCard } from "@/app/(studio)/dashboard/components/canvas-session-card";

export type DashboardCanvasSessionsPageScreenProps = Readonly<{
  sessions: CanvasSessionSummary[];
  totalSessions: number;
  showingCount: number;
  clientNames: Record<string, string>;
}>;

export function DashboardCanvasSessionsPageScreen({
  sessions: initialSessions,
  totalSessions,
  clientNames,
}: DashboardCanvasSessionsPageScreenProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CanvasSessionSummary | null>(null);
  const { execute, busyId } = useServerAction();

  const visibleSessions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter((s) => `${s.name ?? ""}`.toLowerCase().includes(term));
  }, [query, sessions]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    void execute(
      deleteTarget.id,
      deleteCanvasSessionAction,
      [deleteTarget.client_id, deleteTarget.id],
      "Session deleted",
      () => {
        setSessions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        setDeleteTarget(null);
      },
    );
  };

  return (
    <main className="pt-24 pb-12 px-10 min-h-screen bg-surface">
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete session"
        description="This action cannot be undone."
        actionLabel="Delete"
        busyLabel="Deleting..."
        busy={busyId !== null}
        onConfirm={handleDelete}
      />

      <div className="p-0">
        <div className="flex items-end justify-between mb-10">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-widest">
              <span>Dashboard</span>
              <DashboardMaterialIcon icon="chevron_right" className="text-[10px]" />
              <span className="text-dashboard-primary font-bold">Canvas Sessions</span>
            </nav>
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface leading-tight">
              Canvas Sessions
            </h2>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions..."
            className="h-10 rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 text-sm outline-none focus:border-dashboard-primary"
          />
        </div>

        <div className="space-y-3">
          {visibleSessions.map((s, idx) => {
            const thumb = s.thumbnail_url || s.background_url;

            return (
              <CanvasSessionCard
                key={s.id}
                session={s}
                fallbackIcon={idx % 2 === 0 ? "brush" : "history"}
                createdLabel={formatRelativeFromNow(s.created_at)}
                previewUrl={thumb}
                manageHref={`/dashboard/clients/${s.client_id}`}
                deleteDisabled={busyId !== null}
                onDelete={() => setDeleteTarget(s)}
              />
            );
          })}

        </div>

        <div className="mt-16 flex items-center justify-between text-on-surface-variant border-t border-surface-container-high pt-8">
          <p className="text-sm">Showing {visibleSessions.length} of {totalSessions} design sessions</p>
        </div>
      </div>
    </main>
  );
}

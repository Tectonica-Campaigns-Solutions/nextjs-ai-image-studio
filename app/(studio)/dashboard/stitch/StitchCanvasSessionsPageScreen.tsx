"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { CanvasSessionSummary } from "../types";
import { StitchMaterialIcon } from "./StitchMaterialIcon";
import { deleteCanvasSessionAction } from "../actions/canvas-sessions";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type StitchCanvasSessionsPageScreenProps = Readonly<{
  sessions: CanvasSessionSummary[];
  totalSessions: number;
  showingCount: number;
  clientNames: Record<string, string>;
}>;

function formatRelativeFromNow(iso?: string) {
  if (!iso) return "—";
  const dt = new Date(iso).getTime();
  const diffMs = Date.now() - dt;
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

export function StitchCanvasSessionsPageScreen({
  sessions: initialSessions,
  totalSessions,
  clientNames,
}: StitchCanvasSessionsPageScreenProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CanvasSessionSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visibleSessions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter((s) => `${s.name ?? ""}`.toLowerCase().includes(term));
  }, [query, sessions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteCanvasSessionAction(deleteTarget.client_id, deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success("Session deleted");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="pt-24 pb-12 px-10 min-h-screen bg-surface">
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-lg bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5">
          <AlertDialogHeader className="mb-4 pb-4 border-b border-outline-variant/10">
            <AlertDialogTitle className="text-2xl font-extrabold tracking-tight text-on-surface">
              Delete session
            </AlertDialogTitle>
            <AlertDialogDescription className="text-on-surface-variant">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-0">
        <div className="flex items-end justify-between mb-10">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-widest">
              <span>Dashboard</span>
              <StitchMaterialIcon icon="chevron_right" className="text-[10px]" />
              <span className="text-stitch-primary font-bold">Canvas Sessions</span>
            </nav>
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface leading-tight">
              Canvas Sessions
            </h2>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions..."
            className="h-10 rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 text-sm outline-none focus:border-stitch-primary"
          />
        </div>

        <div className="space-y-3">
          {visibleSessions.map((s, idx) => {
            const thumb = s.thumbnail_url || s.background_url;

            return (
              <div
                key={s.id}
                className="group bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-stitch-primary/10 flex items-center justify-center text-stitch-primary shrink-0 overflow-hidden">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={s.name ?? "Canvas session"} src={thumb} className="w-full h-full object-cover" />
                    ) : (
                      <StitchMaterialIcon icon={idx % 2 === 0 ? "brush" : "history"} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{s.name ?? "Untitled Session"}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-medium mt-1">
                      Created {formatRelativeFromNow(s.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/dashboard/clients/${s.client_id}`}
                    className="bg-surface-container-low text-on-surface px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-surface-container-high"
                  >
                    Manage
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(s)}
                    className="bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:bg-destructive/90"
                  >
                    Delete
                  </button>
                  <a
                    href={`/standalone/studio?session_id=${encodeURIComponent(s.id)}&user_id=${encodeURIComponent(s.ca_user_id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-stitch-primary text-stitch-on-primary px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:opacity-90"
                  >
                    Open
                  </a>
                </div>
              </div>
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


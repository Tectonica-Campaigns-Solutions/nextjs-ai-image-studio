"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Trash2, Code, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { CanvasSessionSummary } from "@/app/(studio)/dashboard/types";
import { deleteCanvasSessionAction } from "@/app/(studio)/dashboard/actions/canvas-sessions";

interface CanvasSessionGalleryProps {
  clientId: string;
  sessions: CanvasSessionSummary[];
  onRefresh: () => void;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="h-8 gap-1.5 text-xs"
    >
      {copied ? (
        <>
          <Check className="size-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-3" />
          Copy JSON
        </>
      )}
    </Button>
  );
}

export function CanvasSessionGallery({
  clientId,
  sessions,
  onRefresh,
}: CanvasSessionGalleryProps) {
  const [viewingSession, setViewingSession] = useState<CanvasSessionSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogSessionId, setDeleteDialogSessionId] = useState<string | null>(null);

  const handleDelete = async (sessionId: string) => {
    setDeletingId(sessionId);
    await deleteCanvasSessionAction(clientId, sessionId);
    toast.success("Session deleted");
    setDeletingId(null);
    setDeleteDialogSessionId(null);
    onRefresh();
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <Code className="size-8 text-muted-foreground mx-auto mb-3" aria-hidden />
        <p className="text-sm text-muted-foreground text-pretty">
          No canvas sessions saved for this client yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="group relative border border-border rounded-lg overflow-hidden bg-muted/50 flex flex-col"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
              {session.thumbnail_url ? (
                <Image
                  src={session.thumbnail_url}
                  alt={session.name ?? "Canvas session"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Code className="size-8" />
                  <span className="text-xs">No preview</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3 flex flex-col gap-2 flex-1">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {session.name ?? "Untitled"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                  {formatDate(session.updated_at)}
                </p>
                <p className="text-xs text-muted-foreground/70 font-mono truncate mt-1">
                  {session.id}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs flex-1"
                  onClick={() => setViewingSession(session)}
                >
                  <Code className="size-3" />
                  View JSON
                </Button>

                <a
                  href={`/standalone/studio?session_id=${session.id}&user_id=${session.ca_user_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="size-8 p-0"
                    title="Open in editor"
                  >
                    <ExternalLink className="size-3" />
                  </Button>
                </a>

                <AlertDialog
                  open={deleteDialogSessionId === session.id}
                  onOpenChange={(open) => { if (!open) setDeleteDialogSessionId(null); }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="size-8 p-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled={deletingId === session.id}
                    title="Delete session"
                    onClick={() => setDeleteDialogSessionId(session.id)}
                  >
                    {deletingId === session.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete session?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the session &ldquo;{session.name ?? "Untitled"}&rdquo;. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deletingId === session.id}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                        disabled={deletingId === session.id}
                        onClick={async (e) => {
                          e.preventDefault();
                          await handleDelete(session.id);
                        }}
                      >
                        {deletingId === session.id ? (
                          <>
                            <Loader2 className="size-3 animate-spin shrink-0" />
                            <span>Deleting…</span>
                          </>
                        ) : (
                          "Delete"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* JSON Viewer Dialog */}
      <Dialog
        open={!!viewingSession}
        onOpenChange={(open) => { if (!open) setViewingSession(null); }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-4 pr-6">
              <span className="truncate">
                {viewingSession?.name ?? "Untitled"} — overlay_json
              </span>
              {viewingSession && (
                <CopyButton
                  text={JSON.stringify(
                    { id: viewingSession.id, background_url: viewingSession.background_url },
                    null,
                    2
                  )}
                />
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-md bg-muted p-4 min-h-0">
            <pre className="text-xs text-foreground whitespace-pre-wrap break-all font-mono leading-relaxed">
              {viewingSession
                ? JSON.stringify(
                    {
                      id: viewingSession.id,
                      name: viewingSession.name,
                      background_url: viewingSession.background_url,
                      updated_at: viewingSession.updated_at,
                    },
                    null,
                    2
                  )
                : ""}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2, Code, Copy, Check, ExternalLink } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { CanvasSessionSummary } from "@/app/(studio)/dashboard/types";
import { deleteCanvasSessionAction } from "@/app/(studio)/dashboard/actions/canvas-sessions";

interface CanvasSessionGalleryProps {
  clientId: string;
  sessions: CanvasSessionSummary[];
  onRefresh: () => void;
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("es", {
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

  const handleDelete = async (sessionId: string) => {
    setDeletingId(sessionId);
    await deleteCanvasSessionAction(clientId, sessionId);
    setDeletingId(null);
    onRefresh();
  };

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">
        No hay sesiones de canvas guardadas para este cliente.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="group relative border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex flex-col"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
              {session.thumbnail_url ? (
                <Image
                  src={session.thumbnail_url}
                  alt={session.name ?? "Canvas session"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-400">
                  <Code className="size-8" />
                  <span className="text-xs">Sin preview</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3 flex flex-col gap-2 flex-1">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {session.name ?? "Sin nombre"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDate(session.updated_at)}
                </p>
                <p className="text-xs text-gray-400 font-mono truncate mt-1">
                  {session.id}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs flex-1"
                  onClick={() => setViewingSession(session)}
                >
                  <Code className="size-3" />
                  Ver JSON
                </Button>

                <a
                  href={`/standalone/studio?session_id=${session.id}&user_id=${session.ca_user_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Abrir en editor"
                  >
                    <ExternalLink className="size-3" />
                  </Button>
                </a>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                      disabled={deletingId === session.id}
                      title="Eliminar sesión"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar sesión?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará la sesión &ldquo;{session.name ?? "Sin nombre"}&rdquo;. No se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleDelete(session.id)}
                      >
                        Eliminar
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
                {viewingSession?.name ?? "Sin nombre"} — overlay_json
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
          <div className="flex-1 overflow-auto rounded-md bg-gray-950 p-4 min-h-0">
            <pre className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono leading-relaxed">
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

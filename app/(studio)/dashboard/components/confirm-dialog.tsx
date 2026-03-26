"use client";

import { useEffect, useRef } from "react";
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

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Label for the confirm button. Defaults to "Confirm". */
  actionLabel?: string;
  /** Label shown while busy. Defaults to actionLabel + "..." */
  busyLabel?: string;
  /** Whether the action is currently in progress. Disables buttons. */
  busy?: boolean;
  onConfirm: () => void;
  /** Button variant. Defaults to "destructive". */
  variant?: "destructive" | "primary";
  /** Allow dismiss by clicking outside the dialog. Defaults to false. */
  dismissOnOutsidePointerDown?: boolean;
}

/**
 * Reusable confirmation dialog used throughout the dashboard
 * (delete / deactivate / activate flows).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel = "Confirm",
  busyLabel,
  busy = false,
  onConfirm,
  variant = "destructive",
  dismissOnOutsidePointerDown = false,
}: ConfirmDialogProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  const actionClassName =
    variant === "primary"
      ? "bg-dashboard-primary text-dashboard-on-primary border border-dashboard-primary/10 hover:bg-dashboard-primary/90 hover:text-dashboard-on-primary shadow-sm shadow-dashboard-primary/20 disabled:opacity-70"
      : "bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-70";

  useEffect(() => {
    if (!open) return;
    if (!dismissOnOutsidePointerDown) return;

    const handlePointerDownCapture = (event: MouseEvent | TouchEvent) => {
      if (busy) return;
      const target = event.target as Node | null;
      if (!target) return;

      const clickedInside = contentRef.current?.contains(target) ?? false;
      if (!clickedInside) onOpenChange(false);
    };

    document.addEventListener("mousedown", handlePointerDownCapture, true);
    document.addEventListener("touchstart", handlePointerDownCapture, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDownCapture, true);
      document.removeEventListener("touchstart", handlePointerDownCapture, true);
    };
  }, [busy, dismissOnOutsidePointerDown, onOpenChange, open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="sm:max-w-lg bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5"
        ref={contentRef}
      >
        <AlertDialogHeader className="mb-4 pb-4 border-b border-outline-variant/10">
          <AlertDialogTitle className="text-2xl font-extrabold tracking-tight text-on-surface">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-on-surface-variant">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={busy}
            className="bg-surface-container-lowest border border-outline-variant/10 hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={busy}
            className={actionClassName}
          >
            {busy ? (busyLabel ?? `${actionLabel}...`) : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

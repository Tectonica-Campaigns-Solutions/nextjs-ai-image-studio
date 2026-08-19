"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { studioDialog, studioForm } from "./studio-ui";

export interface SaveSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
  isSaving: boolean;
}

export function SaveSessionModal({
  open,
  onOpenChange,
  onConfirm,
  isSaving,
}: SaveSessionModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed || isSaving) return;
    onConfirm(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={studioDialog.content}>
        <DialogHeader>
          <DialogTitle className={studioDialog.title}>Save session</DialogTitle>
          <DialogDescription className={studioDialog.description}>
            Enter a name for this version. You can load it later from Saved versions.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 pr-1">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Session name"
            className={studioForm.input}
            aria-label="Session name"
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          />
        </div>
        <DialogFooter className={studioDialog.footer}>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className={cn(studioForm.secondaryButton, "min-w-[96px]")}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!name.trim() || isSaving}
            className={cn(studioForm.primaryButton, "min-w-[96px] w-auto px-4")}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

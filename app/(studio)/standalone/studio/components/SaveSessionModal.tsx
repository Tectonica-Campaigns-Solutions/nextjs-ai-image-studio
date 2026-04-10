"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
      <DialogContent className="bg-[#191919] border-[#2D2D2D] text-white sm:max-w-md max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-white font-(family-name:--font-manrope) text-[18px] font-semibold">
            Save session
          </DialogTitle>
          <DialogDescription className="text-[#929292] font-(family-name:--font-manrope) text-[14px]">
            Enter a name for this version. You can load it later from Saved versions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 flex-1 overflow-y-auto pr-1">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Session name"
            className="rounded-[10px] border-[#2D2D2D] bg-[#1F1F1F] text-white font-(family-name:--font-manrope) placeholder:text-white/40"
            aria-label="Session name"
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          />
        </div>
        <DialogFooter className="flex-row gap-2 sm:justify-end border-t border-[#2D2D2D] pt-4 bg-[#191919]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="border-[#2D2D2D] bg-transparent text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!name.trim() || isSaving}
            className="bg-[#5C38F3] text-white hover:bg-[#4A2DD1]"
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

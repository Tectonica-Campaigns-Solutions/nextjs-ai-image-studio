"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { DialogContent } from "@/components/ui/dialog";

export type DashboardDialogContentProps = Readonly<{
  className?: string;
  children: React.ReactNode;
}>;

export function DashboardDialogContent({ className, children }: DashboardDialogContentProps) {
  return (
    <DialogContent
      className={cn(
        "sm:max-w-lg bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5 max-h-[90dvh] overflow-hidden",
        className,
      )}
      showCloseButton
    >
      <div className="subtle-scrollbar max-h-[calc(90dvh-2rem)] overflow-y-auto pr-1">
        {children}
      </div>
    </DialogContent>
  );
}


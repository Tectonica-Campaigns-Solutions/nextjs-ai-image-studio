"use client";

import React from "react";
import { cx } from "@/app/(studio)/dashboard/utils/cx";

export type DashboardStatusPillTone = "success" | "muted" | "warning" | "danger";

export type DashboardStatusPillProps = Readonly<{
  tone: DashboardStatusPillTone;
  label: React.ReactNode;
  showDot?: boolean;
  className?: string;
}>;

const TONE_CLASSES: Record<
  DashboardStatusPillTone,
  { pill: string; dot: string }
> = {
  success: { pill: "bg-green-100 text-green-700", dot: "bg-green-500" },
  muted: { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  warning: { pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  danger: { pill: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

export function DashboardStatusPill({
  tone,
  label,
  showDot = true,
  className,
}: DashboardStatusPillProps) {
  const meta = TONE_CLASSES[tone];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
        meta.pill,
        className,
      )}
    >
      {showDot ? <span className={cx("w-1.5 h-1.5 rounded-full", meta.dot)} /> : null}
      {label}
    </span>
  );
}


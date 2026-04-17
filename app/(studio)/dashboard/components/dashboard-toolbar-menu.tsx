"use client";

import React, { useMemo, useRef } from "react";
import { cx } from "@/app/(studio)/dashboard/utils/cx";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { useDismissOnOutsidePointerDown } from "@/app/(studio)/dashboard/hooks/use-dismiss-on-outside-pointer-down";

export type DashboardToolbarMenuProps = Readonly<{
  icon: string;
  label: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: "left" | "right";
  buttonClassName?: string;
  panelClassName?: string;
  children: React.ReactNode;
}>;

export function DashboardToolbarMenu({
  icon,
  label,
  open,
  onOpenChange,
  align = "left",
  buttonClassName,
  panelClassName,
  children,
}: DashboardToolbarMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useDismissOnOutsidePointerDown({
    enabled: open,
    refs: [rootRef],
    onDismiss: () => onOpenChange(false),
  });

  const id = useMemo(() => `toolbar-menu-${Math.random().toString(16).slice(2)}`, []);

  return (
    <div className="relative" ref={rootRef}>
      <span
        className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base"
        data-icon={icon}
        aria-hidden
      >
        {icon}
      </span>
      <button
        type="button"
        className={cx(
          "pl-10 pr-4 py-2 bg-surface-container-low text-xs font-semibold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-2",
          buttonClassName,
        )}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onOpenChange(!open)}
      >
        {label}
        <DashboardMaterialIcon icon="expand_more" className="text-xs" />
      </button>

      {open ? (
        <div
          id={id}
          role="menu"
          className={cx(
            "absolute top-full mt-2 bg-surface-container-lowest border border-outline-variant/10 rounded-xl shadow-lg z-40",
            align === "right" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}


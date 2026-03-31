"use client";

import { DashboardMaterialIcon } from "./DashboardMaterialIcon";

type DashboardEmptyStateProps = Readonly<{
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}>;

export function DashboardEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant/50 mb-6">
        <DashboardMaterialIcon icon={icon} className="text-4xl" />
      </div>
      <h3 className="text-lg font-bold text-on-surface mb-2">{title}</h3>
      <p className="text-sm text-on-surface-variant max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-dashboard-primary to-dashboard-primary-dim text-dashboard-on-primary font-semibold text-sm shadow-lg shadow-dashboard-primary/20 active:scale-[0.98] transition-transform"
        >
          <DashboardMaterialIcon icon="add" className="text-sm" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

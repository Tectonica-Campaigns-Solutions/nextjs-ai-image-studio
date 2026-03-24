"use client";

import type { ReactNode } from "react";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { cx } from "@/app/(studio)/dashboard/utils/cx";

type BulkAction = {
  label: string;
  icon: string;
  variant?: "default" | "destructive";
  onAction: (selectedIds: string[]) => void;
};

type DashboardEntityTableProps = Readonly<{
  toolbarLeft: ReactNode;
  showingLabel: ReactNode;
  header: ReactNode;
  body: ReactNode;
  emptyState?: ReactNode;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  selectedIds?: string[];
  bulkActions?: BulkAction[];
}>;

function getPaginationButtons(totalPages: number, currentPage: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];
  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  if (left > 2) pages.push("ellipsis");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);

  return pages;
}

export function DashboardEntityTable({
  toolbarLeft,
  showingLabel,
  header,
  body,
  emptyState,
  page,
  totalPages,
  onPageChange,
  selectedIds,
  bulkActions,
}: DashboardEntityTableProps) {
  const hasSelection = selectedIds && selectedIds.length > 0;
  const paginationButtons = getPaginationButtons(totalPages, page);

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10">
      <div className="px-6 py-4 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-surface-container">
        {hasSelection && bulkActions ? (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-dashboard-primary">
              {selectedIds.length} selected
            </span>
            {bulkActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => action.onAction(selectedIds)}
                className={cx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  action.variant === "destructive"
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                )}
              >
                <DashboardMaterialIcon icon={action.icon} className="text-sm" />
                {action.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3">{toolbarLeft}</div>
        )}
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="text-xs font-medium">{showingLabel}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        {totalPages === 0 && emptyState ? (
          emptyState
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>{header}</thead>
            <tbody className="divide-y divide-surface-container">{body}</tbody>
          </table>
        )}
      </div>

      <div className="px-6 py-4 bg-white border-t border-surface-container flex items-center justify-between">
        <button
          className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <DashboardMaterialIcon icon="chevron_left" className="text-sm" />
          Previous
        </button>

        <div className="flex items-center gap-1">
          {paginationButtons.map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <span key={`e-${idx}`} className="px-2 text-on-surface-variant">
                  ...
                </span>
              );
            }

            const num = p as number;
            const isCurrent = num === page;
            return (
              <button
                key={num}
                className={cx(
                  "w-8 h-8 flex items-center justify-center text-xs rounded-lg transition-colors",
                  isCurrent
                    ? "font-bold bg-dashboard-primary text-dashboard-on-primary shadow-md shadow-dashboard-primary/20"
                    : "font-medium hover:bg-surface-container-low"
                )}
                onClick={() => onPageChange(num)}
              >
                {num}
              </button>
            );
          })}
        </div>

        <button
          className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
          <DashboardMaterialIcon icon="chevron_right" className="text-sm" />
        </button>
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { cx } from "@/app/(studio)/dashboard/utils/cx";

type DashboardEntityTableProps = Readonly<{
  toolbarLeft: ReactNode;
  showingLabel: ReactNode;
  header: ReactNode;
  body: ReactNode;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}>;

function getPaginationButtons(totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  return [1, 2, 3, "ellipsis" as const, totalPages];
}

export function DashboardEntityTable({
  toolbarLeft,
  showingLabel,
  header,
  body,
  page,
  totalPages,
  onPageChange,
}: DashboardEntityTableProps) {
  const paginationButtons = getPaginationButtons(totalPages);

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10">
      <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-surface-container">
        <div className="flex items-center gap-3">{toolbarLeft}</div>
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="text-xs font-medium">{showingLabel}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>{header}</thead>
          <tbody className="divide-y divide-surface-container">{body}</tbody>
        </table>
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

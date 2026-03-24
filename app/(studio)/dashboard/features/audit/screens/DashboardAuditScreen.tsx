"use client";

import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { DashboardBreadcrumb } from "@/app/(studio)/dashboard/components/dashboard-breadcrumb";
import { DashboardEmptyState } from "@/app/(studio)/dashboard/components/dashboard-empty-state";
import { formatRelativeTime } from "@/app/(studio)/dashboard/utils/date-formatters";
import type { AuditEntry } from "../data/audit";

const TYPE_ICONS: Record<string, string> = {
  client: "group",
  asset: "folder_open",
  font: "font_download",
  session: "draw",
};

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-500",
  updated: "bg-blue-500",
  deleted: "bg-red-500",
};

type DashboardAuditScreenProps = Readonly<{
  entries: AuditEntry[];
}>;

export function DashboardAuditScreen({ entries }: DashboardAuditScreenProps) {
  return (
    <div className="pt-16 px-10 min-h-screen bg-surface">
      <div className="w-full py-10 space-y-8">
        <div>
          <DashboardBreadcrumb segments={[{ label: "Audit Log" }]} />
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface">Audit Log</h2>
          <p className="text-on-surface-variant mt-2">Recent activity across all entities.</p>
        </div>

        {entries.length === 0 ? (
          <DashboardEmptyState
            icon="history"
            title="No activity yet"
            description="Actions performed in the dashboard will appear here."
          />
        ) : (
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 divide-y divide-surface-container">
            {entries.map((entry) => (
              <div key={entry.id} className="px-6 py-4 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${ACTION_COLORS[entry.action] ?? "bg-slate-400"}`}>
                  <DashboardMaterialIcon icon={TYPE_ICONS[entry.type] ?? "info"} className="text-[16px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface">
                    {entry.entityName}{" "}
                    <span className="text-on-surface-variant font-normal">{entry.action}</span>
                    {entry.clientName && (
                      <span className="text-on-surface-variant font-normal"> for {entry.clientName}</span>
                    )}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {formatRelativeTime(entry.timestamp)}
                  </p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                  entry.action === "created" ? "bg-green-100 text-green-700" :
                  entry.action === "updated" ? "bg-blue-100 text-blue-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {entry.action}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

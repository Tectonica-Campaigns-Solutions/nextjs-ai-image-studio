"use client";

import { useMemo, useState } from "react";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { DashboardBreadcrumb } from "@/app/(studio)/dashboard/components/dashboard-breadcrumb";
import { DashboardEmptyState } from "@/app/(studio)/dashboard/components/dashboard-empty-state";
import { formatRelativeTime } from "@/app/(studio)/dashboard/utils/date-formatters";
import { downloadCSV } from "@/app/(studio)/dashboard/utils/export-utils";
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
  const [typeFilter, setTypeFilter] = useState<AuditEntry["type"] | "all">("all");
  const [actionFilter, setActionFilter] = useState<AuditEntry["action"] | "all">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d">("all");
  const [query, setQuery] = useState("");

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    return entries.filter((entry) => {
      if (typeFilter !== "all" && entry.type !== typeFilter) return false;
      if (actionFilter !== "all" && entry.action !== actionFilter) return false;

      const entryTimestampMs = new Date(entry.timestamp).getTime();
      if (dateFilter === "7d" && now - entryTimestampMs > sevenDaysMs) return false;
      if (dateFilter === "30d" && now - entryTimestampMs > thirtyDaysMs) return false;

      if (!normalizedQuery) return true;
      const haystack = [
        entry.entityName,
        entry.clientName ?? "",
        entry.type,
        entry.action,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [actionFilter, dateFilter, entries, query, typeFilter]);

  const exportFilteredEntries = () => {
    const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    const rows = filteredEntries.map((entry) => [
      entry.timestamp,
      entry.type,
      entry.action,
      entry.entityName,
      entry.clientName ?? "",
    ]);

    downloadCSV(
      filename,
      ["timestamp", "type", "action", "entity_name", "client_name"],
      rows,
    );
  };

  return (
    <div className="pt-16 px-10 min-h-screen bg-surface">
      <div className="w-full py-10 space-y-8">
        <div>
          <DashboardBreadcrumb segments={[{ label: "Audit Log" }]} />
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface">Audit Log</h2>
          <p className="text-on-surface-variant mt-2">Recent activity across all entities.</p>
        </div>

        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Search
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Entity, client, action..."
                className="h-10 rounded-lg border border-outline-variant/20 bg-surface px-3 text-sm text-on-surface outline-none ring-0 focus:border-dashboard-primary"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Type
              </span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as AuditEntry["type"] | "all")}
                className="h-10 rounded-lg border border-outline-variant/20 bg-surface px-3 text-sm text-on-surface outline-none ring-0 focus:border-dashboard-primary"
              >
                <option value="all">All types</option>
                <option value="client">Client</option>
                <option value="asset">Asset</option>
                <option value="font">Font</option>
                <option value="session">Session</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Action
              </span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as AuditEntry["action"] | "all")}
                className="h-10 rounded-lg border border-outline-variant/20 bg-surface px-3 text-sm text-on-surface outline-none ring-0 focus:border-dashboard-primary"
              >
                <option value="all">All actions</option>
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                <option value="deleted">Deleted</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Date range
              </span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as "all" | "7d" | "30d")}
                className="h-10 rounded-lg border border-outline-variant/20 bg-surface px-3 text-sm text-on-surface outline-none ring-0 focus:border-dashboard-primary"
              >
                <option value="all">All time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </label>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Export
              </span>
              <button
                type="button"
                onClick={exportFilteredEntries}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant/20 bg-surface px-3 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                <DashboardMaterialIcon icon="download" className="text-[16px]" />
                Export CSV ({filteredEntries.length})
              </button>
            </div>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <DashboardEmptyState
            icon="history"
            title="No matching activity"
            description="Try changing filters or search terms to see more entries."
          />
        ) : (
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 divide-y divide-surface-container">
            {filteredEntries.map((entry) => (
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

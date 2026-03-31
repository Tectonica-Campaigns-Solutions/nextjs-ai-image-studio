"use client";

import { useMemo, useState } from "react";
import { DashboardPageHeader } from "@/app/(studio)/dashboard/components/dashboard-page-header";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { DashboardEmptyState } from "@/app/(studio)/dashboard/components/dashboard-empty-state";
import { formatRelativeTime } from "@/app/(studio)/dashboard/utils/date-formatters";
import { downloadCSV } from "@/app/(studio)/dashboard/utils/export-utils";
import type { VisualStudioAccessLogEntry } from "../data/visual-studio-access";

type DateFilter = "all" | "7d" | "30d";

type DashboardVisualStudioAccessLogScreenProps = Readonly<{
  entries: VisualStudioAccessLogEntry[];
}>;

export function DashboardVisualStudioAccessLogScreen({
  entries,
}: DashboardVisualStudioAccessLogScreenProps) {
  const [browserFilter, setBrowserFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [query, setQuery] = useState("");

  const filteredEntries = useMemo(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const normalizedQuery = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const ts = new Date(entry.createdAt).getTime();
      if (dateFilter === "7d" && now - ts > sevenDaysMs) return false;
      if (dateFilter === "30d" && now - ts > thirtyDaysMs) return false;

      if (browserFilter !== "all" && entry.browser !== browserFilter) {
        return false;
      }

      if (!normalizedQuery) return true;

      const haystack = [
        entry.caUserId,
        entry.browser ?? "",
        entry.path ?? "",
        entry.ipAddress ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [browserFilter, dateFilter, entries, query]);

  const uniqueBrowsers = useMemo(
    () =>
      Array.from(
        new Set(entries.map((e) => e.browser).filter(Boolean)),
      ) as string[],
    [entries],
  );

  const exportCsv = () => {
    const rows = filteredEntries.map((e) => [
      e.createdAt,
      e.caUserId,
      e.browser ?? "",
      e.path ?? "",
      e.ipAddress ?? "",
    ]);
    downloadCSV(
      `visual-studio-access-${new Date().toISOString().slice(0, 10)}.csv`,
      ["timestamp", "ca_user_id", "browser", "path", "ip"],
      rows,
    );
  };

  return (
    <div className="pt-16 px-10 min-h-screen bg-surface">
      <div className="w-full py-10 space-y-8">
        <DashboardPageHeader
          segments={[{ label: "Visual Studio Logs" }]}
          title="Visual Studio Access"
          description="Access history for the Visual Studio, including browser and path."
        />

        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Search
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ca_user_id, path, IP..."
                className="h-10 rounded-lg border border-outline-variant/20 bg-surface px-3 text-sm text-on-surface outline-none focus:border-dashboard-primary"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Browser
              </span>
              <select
                value={browserFilter}
                onChange={(e) => setBrowserFilter(e.target.value)}
                className="h-10 rounded-lg border border-outline-variant/20 bg-surface px-3 text-sm text-on-surface outline-none focus:border-dashboard-primary"
              >
                <option value="all">All browsers</option>
                {uniqueBrowsers.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Date range
              </span>
              <select
                value={dateFilter}
                onChange={(e) =>
                  setDateFilter(e.target.value as DateFilter)
                }
                className="h-10 rounded-lg border border-outline-variant/20 bg-surface px-3 text-sm text-on-surface outline-none focus:border-dashboard-primary"
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
                onClick={exportCsv}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-outline-variant/20 bg-surface px-3 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                <DashboardMaterialIcon
                  icon="download"
                  className="text-[16px]"
                />
                Export CSV ({filteredEntries.length})
              </button>
            </div>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <DashboardEmptyState
            icon="history"
            title="No matching access events"
            description="Try changing filters or search terms."
          />
        ) : (
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 divide-y divide-surface-container">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="px-6 py-4 flex items-center gap-4"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-dashboard-primary text-dashboard-on-primary">
                  <DashboardMaterialIcon
                    icon="draw"
                    className="text-[16px]"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">
                    {entry.caUserId}{" "}
                    <span className="text-on-surface-variant font-normal">
                      via {entry.browser ?? "Unknown"}
                    </span>
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {entry.path ?? "—"}
                  </p>
                  {entry.ipAddress ? (
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      IP: {entry.ipAddress}
                    </p>
                  ) : null}
                </div>
                <span className="text-[11px] text-on-surface-variant">
                  {formatRelativeTime(entry.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


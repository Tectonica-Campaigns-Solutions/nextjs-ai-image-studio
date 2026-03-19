// This screen controls modals (client-side state).
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { StitchMaterialIcon } from "./StitchMaterialIcon";
import type { DashboardOverviewData } from "../data/overview";
import { CreateClientModal } from "../components/create-client-modal";

function formatRelativeTime(isoDate: string | null | undefined) {
  if (!isoDate) return "—";
  const dt = new Date(isoDate).getTime();
  const diffMs = Date.now() - dt;
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

export type StitchOverviewScreenProps = Readonly<{
  data: DashboardOverviewData;
}>;

export function StitchOverviewScreen({ data }: StitchOverviewScreenProps) {
  const { stats, recentClients } = data;

  const [createClientOpen, setCreateClientOpen] = useState(false);

  const topClients = recentClients.slice(0, 3);
  const recentActivity = recentClients.slice(0, 4);
  const { trends } = data;

  // Show last 7 days to keep the chart readable.
  const trendDates = trends.dates.slice(-7);
  const trendAssets = trends.assets.slice(-7);
  const trendFonts = trends.fonts.slice(-7);
  const trendSessions = trends.sessions.slice(-7);

  const trendTotals = trendAssets.map((v, i) => v + (trendFonts[i] ?? 0) + (trendSessions[i] ?? 0));
  const trendMax = Math.max(1, ...trendTotals);

  const weekdayLabel = (yyyyMmDd: string) => {
    // Interpret as UTC to avoid timezone shifting across day boundaries.
    const dt = new Date(`${yyyyMmDd}T00:00:00.000Z`);
    return dt.toLocaleDateString("en-US", { weekday: "short" });
  };

  const totalClients = Math.max(1, stats.totalClients);
  const activePct = Math.round((stats.activeClients / totalClients) * 100);

  return (
    <div className="pt-24 px-10 pb-12">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">
            Workspace Overview
          </h2>
          <p className="text-on-surface-variant max-w-md">
            You have {stats.activeClients} active clients and {stats.inactiveClients} inactive clients.
            Your workspace currently holds {stats.totalAssets.toLocaleString()} assets and {stats.totalFonts.toLocaleString()} fonts.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-br from-stitch-primary to-stitch-primary-dim text-stitch-on-primary font-bold text-sm shadow-lg shadow-stitch-primary/20 active:scale-[0.98] transition-transform border-none"
            onClick={() => setCreateClientOpen(true)}
            aria-haspopup="dialog"
          >
            <StitchMaterialIcon
              icon="add_circle"
              className="text-[20px]"
              filled
            />
            Create Client
          </button>
        </div>
      </div>

      <CreateClientModal
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
      />

      <div className="grid grid-cols-12 gap-6 mb-8">
        {/* Main Metric */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest p-8 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <span className="text-xs text-on-surface-variant font-bold tracking-widest uppercase opacity-60">
              Total Active Clients
            </span>
            <div className="flex items-baseline gap-3 mt-4">
              <h3 className="text-5xl font-extrabold tracking-tighter text-on-surface">
                {stats.activeClients}
              </h3>
              <span className="text-stitch-primary font-bold text-sm bg-stitch-primary-container px-2 py-0.5 rounded-lg flex items-center">
                <StitchMaterialIcon icon="trending_up" className="text-[16px]" />
                {activePct}%
              </span>
            </div>
          </div>

          <div className="mt-8 relative z-10">
            <p className="text-sm text-on-surface-variant">Across your workspace</p>
          </div>

          <div className="absolute top-0 right-0 w-32 h-32 bg-stitch-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        </div>

        {/* Secondary Metrics */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
            <StitchMaterialIcon icon="inventory_2" className="text-3xl" />
          </div>
          <div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Active Assets
            </span>
            <div className="text-2xl font-bold text-on-surface">
              {stats.totalAssets.toLocaleString()}
            </div>
            <p className="text-xs text-on-surface-variant mt-1 font-medium">
              Assets in your media library
            </p>
          </div>
        </div>

        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container">
            <StitchMaterialIcon icon="timer" className="text-3xl" />
          </div>
          <div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Recent Sessions
            </span>
            <div className="text-2xl font-bold text-on-surface">
              {stats.totalCanvasSessions}
            </div>
            <p className="text-xs text-on-surface-variant mt-1 font-medium">
              Canvas sessions across clients
            </p>
          </div>
        </div>
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-surface-container-low p-8 rounded-xl relative">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h4 className="text-lg font-bold text-on-surface mb-1">
                Activity Trend
              </h4>
              <p className="text-sm text-on-surface-variant">
                New assets, fonts and canvas sessions per day
              </p>
            </div>
            <div className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">
              Last 7 days
            </div>
          </div>

            <div className="h-64 flex items-end gap-2 px-2 relative">
              {trendDates.map((d, i) => {
                const a = trendAssets[i] ?? 0;
                const f = trendFonts[i] ?? 0;
                const s = trendSessions[i] ?? 0;
                const total = a + f + s;

                const aPct = (a / trendMax) * 100;
                const fPct = (f / trendMax) * 100;
                const sPct = (s / trendMax) * 100;

                return (
                  <div key={d} className="flex-1 h-full flex flex-col-reverse relative group">
                    {/* bottom: assets */}
                    <div
                      style={{ height: `${aPct}%` }}
                      className="bg-stitch-primary/25 transition-colors rounded-b-lg"
                    />
                    <div
                      style={{ height: `${fPct}%` }}
                      className="bg-tertiary-container/70 transition-colors"
                    />
                    <div
                      style={{ height: `${sPct}%` }}
                      className="bg-secondary-container/70 transition-colors rounded-t-lg"
                    />

                    {total > 0 ? (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-on-surface text-stitch-on-primary text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {weekdayLabel(d)} • {a} assets • {f} fonts • {s} sessions
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between mt-4 text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest px-2">
              {trendDates.map((d) => (
                <span key={`lbl-${d}`}>{weekdayLabel(d).replace(".", "")}</span>
              ))}
            </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex-1">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-bold text-on-surface">
                Recent Activity
              </h4>
            </div>

            <div className="space-y-6">
              {recentActivity.map((c) => {
                const activeDot = c.is_active;
                const time = c.updated_at ?? c.created_at;
                const title = c.is_active
                  ? `Client Activated: ${c.name}`
                  : `Client Created: ${c.name}`;

                return (
                  <div key={c.id} className="flex gap-4">
                    <div
                      className={activeDot ? "w-2 h-2 rounded-full bg-stitch-primary mt-1.5 shrink-0" : "w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0"}
                    />
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{title}</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {formatRelativeTime(time)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="mt-8 bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b-0 flex items-center justify-between">
          <h4 className="text-lg font-bold text-on-surface">
            High-Performance Clients
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container/50">
                <th className="px-8 py-4 text-on-surface-variant uppercase tracking-wider text-[10px] font-bold">
                  Client Name
                </th>
                <th className="px-8 py-4 text-on-surface-variant uppercase tracking-wider text-[10px] font-bold">
                  Project Status
                </th>
                <th className="px-8 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {topClients.map((c) => {
                const isActive = c.is_active;
                const statusLabel = isActive ? "On Track" : "Delayed";
                const pillClass = isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-error-container/20 text-error";

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-surface-container-highest transition-colors duration-150 group"
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-stitch-primary/10 flex items-center justify-center text-stitch-primary font-bold text-xs">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold">
                          {c.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-8 py-4">
                      <span
                        className={`px-2 py-1 rounded-lg ${pillClass} text-[10px] font-bold uppercase tracking-tight`}
                      >
                        {statusLabel}
                      </span>
                    </td>

                    <td className="px-8 py-4 text-right">
                      <Link
                        href={`/dashboard/clients/${c.id}`}
                        className="inline-flex items-center justify-end"
                      >
                        <StitchMaterialIcon
                          icon="arrow_forward_ios"
                          className="text-slate-400 group-hover:text-stitch-primary transition-colors"
                        />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


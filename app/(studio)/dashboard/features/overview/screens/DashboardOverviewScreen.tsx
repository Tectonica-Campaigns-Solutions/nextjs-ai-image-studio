"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import type { DashboardOverviewData } from "../data/overview";
import { CreateClientModal } from "@/app/(studio)/dashboard/components/create-client-modal";
import { formatRelativeTime } from "@/app/(studio)/dashboard/utils/date-formatters";

type DateRange = 7 | 14 | 30;

const ACTIVITY_ICONS: Record<string, string> = {
  client_created: "person_add",
  client_activated: "check_circle",
  asset_uploaded: "upload_file",
  font_added: "font_download",
  session_started: "draw",
};

const ACTIVITY_COLORS: Record<string, string> = {
  client_created: "bg-slate-300",
  client_activated: "bg-dashboard-primary",
  asset_uploaded: "bg-blue-500",
  font_added: "bg-purple-500",
  session_started: "bg-amber-500",
};

export type DashboardOverviewScreenProps = Readonly<{
  data: DashboardOverviewData;
}>;

export function DashboardOverviewScreen({ data }: DashboardOverviewScreenProps) {
  const { stats, recentClients, activity } = data;
  const router = useRouter();

  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(7);

  const topClients = recentClients.slice(0, 3);
  const totalClients = Math.max(1, stats.totalClients);
  const activePct = Math.round((stats.activeClients / totalClients) * 100);

  const chartData = useMemo(() => {
    const { trends } = data;
    const sliceStart = trends.dates.length - dateRange;
    const dates = trends.dates.slice(sliceStart);
    const assets = trends.assets.slice(sliceStart);
    const fonts = trends.fonts.slice(sliceStart);
    const sessions = trends.sessions.slice(sliceStart);

    return dates.map((d, i) => {
      const dt = new Date(`${d}T00:00:00.000Z`);
      const label = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        date: label,
        Assets: assets[i] ?? 0,
        Fonts: fonts[i] ?? 0,
        Sessions: sessions[i] ?? 0,
      };
    });
  }, [data, dateRange]);

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
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-br from-dashboard-primary to-dashboard-primary-dim text-dashboard-on-primary font-bold text-sm shadow-lg shadow-dashboard-primary/20 active:scale-[0.98] transition-transform border-none"
            onClick={() => setCreateClientOpen(true)}
            aria-haspopup="dialog"
          >
            <DashboardMaterialIcon icon="add_circle" className="text-[20px]" filled />
            Create Client
          </button>
        </div>
      </div>

      <CreateClientModal open={createClientOpen} onOpenChange={setCreateClientOpen} />

      <div className="grid grid-cols-12 gap-6 mb-8">
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest p-8 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <span className="text-xs text-on-surface-variant font-bold tracking-widest uppercase opacity-60">
              Total Active Clients
            </span>
            <div className="flex items-baseline gap-3 mt-4">
              <h3 className="text-5xl font-extrabold tracking-tighter text-on-surface">
                {stats.activeClients}
              </h3>
              <span className="text-dashboard-primary font-bold text-sm bg-dashboard-primary-container px-2 py-0.5 rounded-lg flex items-center">
                <DashboardMaterialIcon icon="trending_up" className="text-[16px]" />
                {activePct}%
              </span>
            </div>
          </div>
          <div className="mt-8 relative z-10">
            <p className="text-sm text-on-surface-variant">Across your workspace</p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-dashboard-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        </div>

        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
            <DashboardMaterialIcon icon="inventory_2" className="text-3xl" />
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
            <DashboardMaterialIcon icon="timer" className="text-3xl" />
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
          <div className="flex justify-between items-start mb-8">
            <div>
              <h4 className="text-lg font-bold text-on-surface mb-1">Activity Trend</h4>
              <p className="text-sm text-on-surface-variant">
                New assets, fonts and canvas sessions per day
              </p>
            </div>
            <div className="flex gap-1 bg-surface-container-lowest rounded-lg p-0.5">
              {([7, 14, 30] as DateRange[]).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors ${dateRange === range
                    ? "bg-dashboard-primary text-dashboard-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                    }`}
                >
                  {range}d
                </button>
              ))}
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline-variant, #e2e8f0)" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-on-surface-variant, #64748b)" }}
                  tickLine={false}
                  axisLine={false}
                  interval={dateRange <= 7 ? 0 : dateRange <= 14 ? 1 : 3}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-on-surface-variant, #64748b)" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-surface-container-lowest, #fff)",
                    border: "1px solid var(--color-outline-variant, #e2e8f0)",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="Assets" fill="rgb(59 130 246 / 0.6)" stackId="a" />
                <Bar dataKey="Fonts" fill="rgb(168 85 247 / 0.5)" stackId="a" />
                <Bar dataKey="Sessions" fill="rgb(245 158 11 / 0.5)" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex-1">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-bold text-on-surface">Recent Activity</h4>
            </div>

            <div className="space-y-5">
              {activity.length === 0 ? (
                <p className="text-sm text-on-surface-variant text-center py-6">No recent activity</p>
              ) : (
                activity.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex gap-3 items-start">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ACTIVITY_COLORS[item.type] ?? "bg-slate-300"} text-white`}
                    >
                      <DashboardMaterialIcon
                        icon={ACTIVITY_ICONS[item.type] ?? "info"}
                        className="text-[14px]"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{item.title}</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {formatRelativeTime(item.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="mt-8 bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b-0 flex items-center justify-between">
          <h4 className="text-lg font-bold text-on-surface">High-Performance Clients</h4>
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
                    className="hover:bg-surface-container-highest transition-colors duration-150 group cursor-pointer"
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/dashboard/clients/${c.id}`);
                      }
                    }}
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-dashboard-primary/10 flex items-center justify-center text-dashboard-primary font-bold text-xs">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className={`px-2 py-1 rounded-lg ${pillClass} text-[10px] font-bold uppercase tracking-tight`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <span className="inline-flex items-center justify-end">
                        <DashboardMaterialIcon
                          icon="arrow_forward_ios"
                          className="text-slate-400 group-hover:text-dashboard-primary transition-colors"
                        />
                      </span>
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

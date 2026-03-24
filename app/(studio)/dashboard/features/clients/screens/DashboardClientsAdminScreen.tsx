"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { DashboardBreadcrumb } from "@/app/(studio)/dashboard/components/dashboard-breadcrumb";
import { DashboardEmptyState } from "@/app/(studio)/dashboard/components/dashboard-empty-state";
import type { Client } from "@/app/(studio)/dashboard/utils/types";
import { CreateClientModal } from "@/app/(studio)/dashboard/components/create-client-modal";
import type {
  ClientSortKey,
  ClientStatusFilter,
} from "../data/clients";
import { cx } from "@/app/(studio)/dashboard/utils/cx";
import { formatDateLong } from "@/app/(studio)/dashboard/utils/date-formatters";
import { StatCard } from "@/app/(studio)/dashboard/components/stat-card";
import { DashboardEntityTable } from "@/app/(studio)/dashboard/components/dashboard-entity-table";

type DashboardClientsAdminScreenProps = Readonly<{
  stats: {
    totalClients: number;
    activeClients: number;
    totalAssets: number;
    totalFonts: number;
    totalCanvasSessions: number;
  };
  clients: Client[];
  totalClients: number;
  currentPage: number;
  pageSize: number;
  currentStatus: ClientStatusFilter;
  currentSort: ClientSortKey;
  currentSearch: string;
  assetCountsByClientId: Record<string, number>;
  logoByClientId: Record<string, string | null | undefined>;
}>;

export function DashboardClientsAdminScreen({
  stats,
  clients,
  totalClients,
  currentPage,
  pageSize,
  currentStatus,
  currentSort,
  currentSearch,
  assetCountsByClientId,
  logoByClientId,
}: DashboardClientsAdminScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const totalPages = Math.max(1, Math.ceil(totalClients / pageSize));

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    const allIds = clients.map((c) => c.id);
    setSelectedIds((prev) =>
      prev.length === allIds.length ? [] : allIds
    );
  }, [clients]);

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  const [localSearch, setLocalSearch] = useState(currentSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "" || (key === "page" && value === "1") || (key === "status" && value === "all") || (key === "sort" && value === "created")) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const clickedInsideFilter = filterMenuRef.current?.contains(target) ?? false;
      const clickedInsideSort = sortMenuRef.current?.contains(target) ?? false;
      if (!clickedInsideFilter && !clickedInsideSort) {
        setFilterOpen(false);
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ search: value.trim() || undefined, page: "1" });
      }, 350);
    },
    [updateParams],
  );

  return (
    <>
      <CreateClientModal open={createOpen} onOpenChange={setCreateOpen} />

      <div className="pt-16 px-10 min-h-screen bg-surface">
        <div className="w-full py-10 space-y-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <DashboardBreadcrumb segments={[{ label: "Clients" }]} />
              <h2 className="text-4xl font-extrabold tracking-tight text-on-surface">Clients</h2>
            </div>
            <button
              className="bg-gradient-to-br from-dashboard-primary to-dashboard-primary-dim text-dashboard-on-primary px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-dashboard-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <DashboardMaterialIcon icon="add" className="text-sm" />
              Create Client
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-10">
            <StatCard label="Total Clients" value={stats.totalClients} meta="+12%" metaClassName="text-green-600" />
            <StatCard label="Active Now" value={stats.activeClients} meta="Stable" metaClassName="text-blue-600" />
            <StatCard label="Assets Stored" value={stats.totalAssets} meta="+4%" metaClassName="text-green-600" />
          </div>

          <DashboardEntityTable
            toolbarLeft={
              <>
                <div className="relative" ref={filterMenuRef}>
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" data-icon="filter_list">
                    filter_list
                  </span>
                  <button
                    type="button"
                    className="pl-10 pr-4 py-2 bg-surface-container-low text-xs font-semibold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-2"
                    aria-expanded={filterOpen}
                    onClick={() => {
                      setFilterOpen((v) => !v);
                      setSortOpen(false);
                    }}
                  >
                    Filter{currentStatus !== "all" ? ` (${currentStatus})` : ""}
                    <DashboardMaterialIcon icon="expand_more" className="text-xs" />
                  </button>
                  {filterOpen ? (
                    <div className="absolute left-0 top-full mt-2 w-[340px] bg-surface-container-lowest border border-outline-variant/10 rounded-xl shadow-lg p-4 z-40">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                        Filter clients
                      </div>
                      <div className="relative mb-3">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                          search
                        </span>
                        <input
                          value={localSearch}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          className="w-full bg-surface-container-low border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-dashboard-primary/20 placeholder:text-on-surface-variant/50"
                          placeholder="Search clients..."
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          Status
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {([
                            { key: "all", label: "All" },
                            { key: "active", label: "Active" },
                            { key: "inactive", label: "Inactive" },
                          ] as Array<{ key: ClientStatusFilter; label: string }>).map((opt) => {
                            const active = currentStatus === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                className={cx(
                                  "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                                  active
                                    ? "bg-dashboard-primary text-dashboard-on-primary"
                                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                                )}
                                onClick={() => {
                                  updateParams({ status: opt.key, page: "1" });
                                  setFilterOpen(false);
                                }}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative" ref={sortMenuRef}>
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" data-icon="sort">
                    sort
                  </span>
                  <button
                    type="button"
                    className="pl-10 pr-4 py-2 bg-surface-container-low text-xs font-semibold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-2"
                    aria-expanded={sortOpen}
                    onClick={() => {
                      setSortOpen((v) => !v);
                      setFilterOpen(false);
                    }}
                  >
                    Sort
                    <DashboardMaterialIcon icon="expand_more" className="text-xs" />
                  </button>
                  {sortOpen ? (
                    <div className="absolute left-0 top-full mt-2 w-[280px] bg-surface-container-lowest border border-outline-variant/10 rounded-xl shadow-lg p-3 z-40">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Sort by
                      </div>
                      <div className="flex flex-col gap-1">
                        {([
                          { key: "created", label: "Created date" },
                          { key: "name", label: "Name" },
                          { key: "updated", label: "Last updated" },
                        ] as Array<{ key: ClientSortKey; label: string }>).map((opt) => {
                          const active = currentSort === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              className={cx(
                                "w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors",
                                active
                                  ? "bg-dashboard-primary text-dashboard-on-primary"
                                  : "hover:bg-surface-container-high text-on-surface-variant"
                              )}
                              onClick={() => {
                                updateParams({ sort: opt.key, page: "1" });
                                setSortOpen(false);
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            }
            showingLabel={`Showing ${clients.length} of ${totalClients} results`}
            selectedIds={selectedIds}
            bulkActions={[
              {
                label: "Export CSV",
                icon: "download",
                onAction: (ids) => {
                  const selected = clients.filter((c) => ids.includes(c.id));
                  const csv = ["Name,Email,Status,Created"]
                    .concat(selected.map((c) => `"${c.name}","${c.email ?? c.ca_user_id}","${c.is_active ? "Active" : "Inactive"}","${c.created_at}"`))
                    .join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "clients-export.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                },
              },
            ]}
            header={
              <tr className="bg-surface-container-low">
                <th className="px-3 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === clients.length && clients.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-outline-variant/30"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Client Name
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Created Date
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">
                  Assets Count
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Status
                </th>
              </tr>
            }
            body={
              <>
                {clients.map((client) => {
                  const assetsCount = assetCountsByClientId[client.id] ?? 0;
                  const statusActive = client.is_active;
                  const avatarUrl = logoByClientId[client.id];
                  const avatarAlt = `${client.name} logo`;
                  const initials = client.name.trim().charAt(0).toUpperCase();

                  return (
                    <tr
                      key={client.id}
                      className={cx(
                        "group hover:bg-surface-container-highest transition-colors cursor-pointer",
                        selectedIds.includes(client.id) && "bg-dashboard-primary/[0.03]"
                      )}
                      onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                    >
                      <td className="px-3 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(client.id)}
                          onChange={() => toggleSelect(client.id)}
                          className="rounded border-outline-variant/30"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {avatarUrl ? (
                            <img
                              className="w-9 h-9 rounded-lg bg-surface-container-low p-1 object-contain"
                              alt={avatarAlt}
                              src={avatarUrl}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-surface-container-low p-1 flex items-center justify-center text-on-surface text-xs font-bold">
                              {initials}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-on-surface">{client.name}</p>
                            <p className="text-xs text-on-surface-variant">{client.email ?? client.ca_user_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">{formatDateLong(client.created_at)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-on-surface text-right">
                        {assetsCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            statusActive
                              ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-green-100 text-green-700"
                              : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600"
                          }
                        >
                          <span
                            className={
                              statusActive
                                ? "w-1.5 h-1.5 rounded-full bg-green-500"
                                : "w-1.5 h-1.5 rounded-full bg-slate-400"
                            }
                          />
                          {statusActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </>
            }
            emptyState={
              <DashboardEmptyState
                icon="group"
                title="No clients found"
                description={currentSearch ? "Try a different search term." : "Create your first client to get started."}
                actionLabel={!currentSearch ? "Create Client" : undefined}
                onAction={!currentSearch ? () => setCreateOpen(true) : undefined}
              />
            }
            page={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => updateParams({ page: String(p) })}
          />
        </div>
      </div>
    </>
  );
}

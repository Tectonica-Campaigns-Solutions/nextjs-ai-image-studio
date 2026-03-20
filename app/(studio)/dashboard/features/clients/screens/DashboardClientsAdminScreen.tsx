"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { paginateItems } from "@/app/(studio)/dashboard/utils/data-utils";
import { useRouter } from "next/navigation";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
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
  assetCountsByClientId: Record<string, number>;
  logoByClientId: Record<string, string | null | undefined>;
}>;

export function DashboardClientsAdminScreen({
  stats,
  clients,
  totalClients,
  currentPage,
  pageSize,
  assetCountsByClientId,
  logoByClientId,
}: DashboardClientsAdminScreenProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  // Keep a local copy so filters/sort/pagination are client-side (no query params).
  const [clientsState, setClientsState] = useState<Client[]>(clients);
  useEffect(() => {
    setClientsState(clients);
    // Ensure newly created/updated clients are visible on refresh.
    setPage(1);
  }, [clients]);

  const [page, setPage] = useState(Math.max(1, currentPage));
  useEffect(() => {
    setPage(1);
  }, [currentPage]);

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  const [statusFilter, setStatusFilter] =
    useState<ClientStatusFilter>("all");
  const [sortKey, setSortKey] = useState<ClientSortKey>("created");

  const [localSearch, setLocalSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, sortKey, searchQuery]);

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

  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value.trim());
    }, 250);
  }, []);

  const filteredSortedClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = clientsState;
    if (statusFilter === "active") list = list.filter((c) => c.is_active);
    if (statusFilter === "inactive") list = list.filter((c) => !c.is_active);

    if (q) {
      list = list.filter((c) => {
        const haystack = [
          c.name,
          c.ca_user_id,
          c.email ?? "",
          c.description ?? "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortKey === "name") {
        return (a.name ?? "").localeCompare(b.name ?? "");
      }
      if (sortKey === "updated") {
        const aT = a.updated_at ? new Date(a.updated_at).getTime() : -1;
        const bT = b.updated_at ? new Date(b.updated_at).getTime() : -1;
        return bT - aT;
      }
      // created
      const aT = a.created_at ? new Date(a.created_at).getTime() : -1;
      const bT = b.created_at ? new Date(b.created_at).getTime() : -1;
      return bT - aT;
    });

    return sorted;
  }, [clientsState, searchQuery, statusFilter, sortKey]);

  const { paged: pagedClients, totalPages } = useMemo(
    () => paginateItems(filteredSortedClients, page, pageSize),
    [filteredSortedClients, page, pageSize]
  );

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const showingCount = pagedClients.length;

  return (
    <>
      <CreateClientModal open={createOpen} onOpenChange={setCreateOpen} />

      <div className="pt-16 px-10 min-h-screen bg-surface">
        <div className="w-full py-10 space-y-8">
          {/* Page Header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-widest">
                <span>Dashboard</span>
                <DashboardMaterialIcon icon="chevron_right" className="text-[10px]" />
                <span className="text-dashboard-primary font-bold">Clients</span>
              </nav>
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

          {/* Dashboard Stats Tonal Layering */}
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
                    Filter
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
                            const active = statusFilter === opt.key;
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
                                  setStatusFilter(opt.key as ClientStatusFilter);
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
                          const active = sortKey === opt.key;
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
                                setSortKey(opt.key as ClientSortKey);
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
            showingLabel={`Showing ${showingCount} of ${filteredSortedClients.length} results`}
            header={
              <tr className="bg-surface-container-low">
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
                {pagedClients.map((client) => {
                  const assetsCount = assetCountsByClientId[client.id] ?? 0;
                  const statusActive = client.is_active;
                  const avatarUrl = logoByClientId[client.id];
                  const avatarAlt = `${client.name} logo`;
                  const initials = client.name.trim().charAt(0).toUpperCase();

                  return (
                    <tr
                      key={client.id}
                      className="group hover:bg-surface-container-highest transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                    >
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
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />

        </div>
      </div>
    </>
  );
}


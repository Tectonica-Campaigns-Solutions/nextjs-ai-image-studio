"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { paginateItems } from "@/app/(studio)/dashboard/utils/data-utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Admin } from "@/app/(studio)/dashboard/utils/types";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { CreateAdminModal } from "@/app/(studio)/dashboard/components/create-admin-modal";
import { cx } from "@/app/(studio)/dashboard/utils/cx";
import { formatDateLong } from "@/app/(studio)/dashboard/utils/date-formatters";
import { StatCard } from "@/app/(studio)/dashboard/components/stat-card";
import { DashboardEntityTable } from "@/app/(studio)/dashboard/components/dashboard-entity-table";
import { DashboardEmptyState } from "@/app/(studio)/dashboard/components/dashboard-empty-state";
import { downloadCSV } from "@/app/(studio)/dashboard/utils/export-utils";
import { DashboardToolbarMenu } from "@/app/(studio)/dashboard/components/dashboard-toolbar-menu";
import { DashboardPageHeader } from "@/app/(studio)/dashboard/components/dashboard-page-header";
import { DashboardStatusPill } from "@/app/(studio)/dashboard/components/dashboard-status-pill";

export type AdminSortKey = "granted_at" | "name";
export type AdminStatusFilter = "all" | "active" | "inactive";

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function getAdminLabel(admin: Admin) {
  const name = admin.display_name?.trim();
  if (name) return name;
  if (admin.email && admin.email !== "N/A") return admin.email;
  return "Admin";
}

function getAdminSubLabel(admin: Admin) {
  return admin.email && admin.email !== "N/A" ? admin.email : admin.user_id;
}

export type DashboardAdminsListScreenProps = Readonly<{
  admins: Admin[];
  currentUserId: string | null;
  currentStatus: AdminStatusFilter;
  currentSort: AdminSortKey;
  currentSearch: string;
  currentPage: number;
}>;

export function DashboardAdminsListScreen({
  admins,
  currentUserId,
  currentStatus,
  currentSort,
  currentSearch,
  currentPage,
}: DashboardAdminsListScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(currentSearch);
  const [status, setStatus] = useState<AdminStatusFilter>(currentStatus);
  const [sortKey, setSortKey] = useState<AdminSortKey>(currentSort);
  const [page, setPage] = useState(currentPage);
  const pageSize = 25;

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
        if (
          value === undefined ||
          value === "" ||
          (key === "page" && value === "1") ||
          (key === "status" && value === "active") ||
          (key === "sort" && value === "granted_at")
        ) {
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

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      setPage(1);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ search: value.trim() || undefined, page: "1" });
      }, 350);
    },
    [updateParams],
  );

  const filteredSorted = useMemo(() => {
    const q = localSearch.trim().toLowerCase();

    // By default, hide inactive (soft-deleted) admins from the list.
    // They are only shown when the explicit "Inactive" filter is selected.
    let list = admins;
    if (status === "all") {
      list = list.filter((a) => a.is_active);
    } else if (status === "active") {
      list = list.filter((a) => a.is_active);
    } else if (status === "inactive") {
      list = list.filter((a) => !a.is_active);
    }

    if (q) {
      list = list.filter((a) => {
        const label = getAdminLabel(a).toLowerCase();
        const sub = getAdminSubLabel(a).toLowerCase();
        return label.includes(q) || sub.includes(q);
      });
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortKey === "name") return getAdminLabel(a).localeCompare(getAdminLabel(b));
      const aT = a.granted_at ? new Date(a.granted_at).getTime() : -1;
      const bT = b.granted_at ? new Date(b.granted_at).getTime() : -1;
      return bT - aT;
    });

    return sorted;
  }, [admins, localSearch, status, sortKey]);

  const { paged: pagedAdmins, totalPages } = useMemo(
    () => paginateItems(filteredSorted, page, pageSize),
    [filteredSorted, page]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleSelectAll = useCallback(() => {
    const allIds = pagedAdmins.map((a) => a.id);
    setSelectedIds((prev) => (prev.length === allIds.length ? [] : allIds));
  }, [pagedAdmins]);

  const showingCount = pagedAdmins.length;
  const stats = useMemo(() => {
    const total = admins.length;
    const active = admins.filter((a) => a.is_active).length;
    const inactive = total - active;
    const expired = admins.filter((a) => a.is_active && isExpired(a.expires_at)).length;
    return { total, active, inactive, expired };
  }, [admins]);

  return (
    <div className="pt-16 px-10 min-h-screen bg-surface">
      <div className="w-full py-10 space-y-8">
        {/* Header */}
        <div className="mb-10">
          <DashboardPageHeader
            segments={[{ label: "Admins" }]}
            title="Admins"
            actions={
              <button
                className="bg-gradient-to-br from-dashboard-primary to-dashboard-primary-dim text-dashboard-on-primary px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-dashboard-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                onClick={() => setCreateOpen(true)}
              >
                <DashboardMaterialIcon icon="add" className="text-sm" />
                Create Admin
              </button>
            }
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            label="Total Admins"
            value={stats.total}
            meta="+0%"
            metaClassName="text-green-600"
          />
          <StatCard
            label="Active Now"
            value={stats.active}
            meta="Live"
            metaClassName="text-blue-600"
          />
          {stats.inactive > 0 && (
            <button
              type="button"
              className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-primary/60 rounded-xl"
              onClick={() => {
                setStatus("inactive");
                setPage(1);
                updateParams({ status: "inactive", page: "1" });
              }}
            >
              <StatCard
                label="Inactive"
                value={stats.inactive}
                meta="View list"
                metaClassName="text-orange-500"
              />
            </button>
          )}
          <StatCard
            label="Expired"
            value={stats.expired}
            meta="Soon"
            metaClassName="text-rose-600"
          />
        </div>

        <DashboardEntityTable
          toolbarLeft={
            <>
              <DashboardToolbarMenu
                icon="filter_list"
                label={
                  <>
                    Filter{status !== "all" ? ` (${status})` : ""}
                  </>
                }
                open={filterOpen}
                onOpenChange={(next) => {
                  setFilterOpen(next);
                  if (next) setSortOpen(false);
                }}
                panelClassName="w-[340px] p-4"
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                  Filter admins
                </div>
                <div className="relative mb-3">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                    search
                  </span>
                  <input
                    value={localSearch}
                    onChange={(e) => {
                      handleSearchChange(e.target.value);
                    }}
                    className="w-full bg-surface-container-low border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-dashboard-primary/20 placeholder:text-on-surface-variant/50"
                    placeholder="Search admins..."
                  />
                </div>
                <div className="space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Status
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {([
                      { key: "active", label: "Active" },
                      { key: "inactive", label: "Inactive" },
                    ] as Array<{ key: AdminStatusFilter; label: string }>).map((opt) => {
                      const active = status === opt.key;
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
                            setStatus(opt.key);
                            setPage(1);
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
              </DashboardToolbarMenu>

              <DashboardToolbarMenu
                icon="sort"
                label="Sort"
                open={sortOpen}
                onOpenChange={(next) => {
                  setSortOpen(next);
                  if (next) setFilterOpen(false);
                }}
                panelClassName="w-[280px] p-3"
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Sort by
                </div>
                <div className="flex flex-col gap-1">
                  {([
                    { key: "granted_at", label: "Created date" },
                    { key: "name", label: "Name" },
                  ] as Array<{ key: AdminSortKey; label: string }>).map((opt) => {
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
                          setSortKey(opt.key);
                          setPage(1);
                          setSortOpen(false);
                          updateParams({ sort: opt.key, page: "1" });
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </DashboardToolbarMenu>
            </>
          }
          showingLabel={`Showing ${showingCount} of ${filteredSorted.length} results`}
          isEmpty={filteredSorted.length === 0}
          selectedIds={selectedIds}
          bulkActions={[
            {
              label: "Export CSV",
              icon: "download",
              onAction: (ids) => {
                const selected = admins.filter((a) => ids.includes(a.id));
                downloadCSV(
                  "admins-export.csv",
                  ["Name", "Email", "Status", "Granted At"],
                  selected.map((a) => [
                    getAdminLabel(a),
                    a.email ?? "",
                    a.is_active ? "Active" : "Inactive",
                    a.granted_at ?? "",
                  ]),
                );
              },
            },
          ]}
          header={
            <tr className="bg-surface-container-low">
              <th className="px-3 py-4 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.length === pagedAdmins.length && pagedAdmins.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-outline-variant/30"
                />
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Admin Name
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Created Date
              </th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                Status
              </th>
            </tr>
          }
          body={
            <>
              {pagedAdmins.map((admin) => {
                const expired = admin.is_active && isExpired(admin.expires_at);
                const isYou = currentUserId != null && admin.user_id === currentUserId;
                const statusTone: "muted" | "warning" | "success" =
                  !admin.is_active ? "muted" : expired ? "warning" : "success";
                const statusLabel = !admin.is_active ? "Inactive" : expired ? "Expired" : "Active";

                return (
                  <tr
                    key={admin.id}
                    className={cx(
                      "group hover:bg-surface-container-highest transition-colors cursor-pointer",
                      isYou && "bg-dashboard-primary/[0.03]",
                      selectedIds.includes(admin.id) && "bg-dashboard-primary/[0.03]"
                    )}
                    onClick={() => router.push(`/dashboard/admins/${admin.id}`)}
                  >
                    <td className="px-3 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(admin.id)}
                        onChange={() => toggleSelect(admin.id)}
                        className="rounded border-outline-variant/30"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cx(
                          "w-9 h-9 rounded-lg p-1 flex items-center justify-center text-xs font-bold",
                          isYou
                            ? "bg-dashboard-primary/15 text-dashboard-primary"
                            : "bg-surface-container-low text-on-surface"
                        )}>
                          {getAdminLabel(admin).trim().charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface flex items-center gap-2">
                            {getAdminLabel(admin)}
                            {isYou && (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-dashboard-primary bg-dashboard-primary/10 px-1.5 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-on-surface-variant">{getAdminSubLabel(admin)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{formatDateLong(admin.granted_at)}</td>
                    <td className="px-6 py-4">
                      <DashboardStatusPill tone={statusTone} label={statusLabel} />
                    </td>
                  </tr>
                );
              })}
            </>
          }
          emptyState={
            <div className="py-0 px-4 text-sm text-on-surface-variant text-center">
              {status === "inactive"
                ? "There are no inactive admins right now."
                : "There are no admins matching the current filters."}
            </div>
          }
          page={page}
          totalPages={totalPages}
          onPageChange={(p) => {
            setPage(p);
            updateParams({ page: String(p) });
          }}
        />

        <CreateAdminModal open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </div>
  );
}



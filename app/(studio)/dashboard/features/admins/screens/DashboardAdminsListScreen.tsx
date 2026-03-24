"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { paginateItems } from "@/app/(studio)/dashboard/utils/data-utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Admin } from "@/app/(studio)/dashboard/utils/types";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { CreateAdminModal } from "@/app/(studio)/dashboard/components/create-admin-modal";
import { cx } from "@/app/(studio)/dashboard/utils/cx";
import { formatDateLong } from "@/app/(studio)/dashboard/utils/date-formatters";
import { StatCard } from "@/app/(studio)/dashboard/components/stat-card";
import { DashboardEntityTable } from "@/app/(studio)/dashboard/components/dashboard-entity-table";

type AdminSortKey = "granted_at" | "name";
type AdminStatusFilter = "all" | "active" | "inactive";

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
}>;

export function DashboardAdminsListScreen({
  admins,
  currentUserId: _currentUserId,
}: DashboardAdminsListScreenProps) {
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminStatusFilter>("all");
  const [sortKey, setSortKey] = useState<AdminSortKey>("granted_at");
  const [page, setPage] = useState(1);
  const pageSize = 25;

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

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = admins;
    if (status !== "all") {
      list = list.filter((a) => {
        if (!a.is_active) return status === "inactive";
        return status === "active";
      });
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
  }, [admins, search, status, sortKey]);

  const { paged: pagedAdmins, totalPages } = useMemo(
    () => paginateItems(filteredSorted, page, pageSize),
    [filteredSorted, page]
  );

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
        <div className="flex items-end justify-between mb-10">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-widest">
              <Link href="/dashboard" className="hover:text-on-surface transition-colors">
                Dashboard
              </Link>
              <DashboardMaterialIcon icon="chevron_right" className="text-[10px]" />
              <span className="text-dashboard-primary font-bold">Admins</span>
            </nav>
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface">Admins</h2>
          </div>
          <button
            className="bg-gradient-to-br from-dashboard-primary to-dashboard-primary-dim text-dashboard-on-primary px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-dashboard-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <DashboardMaterialIcon icon="add" className="text-sm" />
            Create Admin
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          <StatCard label="Total Admins" value={stats.total} meta="+0%" metaClassName="text-green-600" />
          <StatCard label="Active Now" value={stats.active} meta="Live" metaClassName="text-blue-600" />
          <StatCard label="Inactive" value={stats.inactive} meta="—" metaClassName="text-orange-500" />
          <StatCard label="Expired" value={stats.expired} meta="Soon" metaClassName="text-rose-600" />
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
                      Filter admins
                    </div>
                    <div className="relative mb-3">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                        search
                      </span>
                      <input
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
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
                          { key: "all", label: "All" },
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
          showingLabel={`Showing ${showingCount} of ${filteredSorted.length} results`}
          header={
            <tr className="bg-surface-container-low">
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
                const statusPill = !admin.is_active
                  ? { bg: "bg-slate-100", fg: "text-slate-600", dot: "bg-slate-400", label: "Inactive" }
                  : expired
                    ? { bg: "bg-amber-100", fg: "text-amber-700", dot: "bg-amber-500", label: "Expired" }
                    : { bg: "bg-green-100", fg: "text-green-700", dot: "bg-green-500", label: "Active" };

                return (
                  <tr
                    key={admin.id}
                    className="group hover:bg-surface-container-highest transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/admins/${admin.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-surface-container-low p-1 flex items-center justify-center text-on-surface text-xs font-bold">
                          {getAdminLabel(admin).trim().charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">
                            {getAdminLabel(admin)}
                          </p>
                          <p className="text-xs text-on-surface-variant">{getAdminSubLabel(admin)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{formatDateLong(admin.granted_at)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusPill.bg} ${statusPill.fg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusPill.dot}`} />
                        {statusPill.label}
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

        <CreateAdminModal open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </div>
  );
}



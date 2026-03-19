"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Admin } from "../types";
import { StitchMaterialIcon } from "./StitchMaterialIcon";
import {
  deleteAdminAction,
  updateAdminAction,
} from "../actions/admins";
import { CreateAdminModal } from "../components/create-admin-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

function formatDateLong(iso?: string | null) {
  if (!iso) return "—";
  const dt = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = months[dt.getUTCMonth()] ?? "—";
  const day = String(dt.getUTCDate()).padStart(2, "0");
  const y = dt.getUTCFullYear();
  return `${m} ${day}, ${y}`;
}

export type StitchAdminsListScreenProps = Readonly<{
  admins: Admin[];
  currentUserId: string | null;
}>;

export function StitchAdminsListScreen({
  admins,
  currentUserId,
}: StitchAdminsListScreenProps) {
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminStatusFilter>("all");
  const [sortKey, setSortKey] = useState<AdminSortKey>("granted_at");
  const [page, setPage] = useState(1);
  const pageSize = 25;

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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredSorted.length / pageSize)),
    [filteredSorted.length]
  );

  const pagedAdmins = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, page]);

  const showingCount = pagedAdmins.length;

  const [busyAdminId, setBusyAdminId] = useState<string | null>(null);

  const handleToggleActive = useCallback(
    async (admin: Admin) => {
      if (admin.id === busyAdminId) return;
      try {
        setBusyAdminId(admin.id);
        const result = await updateAdminAction(admin.id, {
          is_active: !admin.is_active,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(!admin.is_active ? "Admin activated" : "Admin deactivated");
        router.refresh();
      } finally {
        setBusyAdminId(null);
      }
    },
    [busyAdminId, router]
  );

  const handleDeactivate = useCallback(
    async (admin: Admin) => {
      if (admin.id === busyAdminId) return;
      const ok = window.confirm(
        `Delete/deactivate admin "${getAdminLabel(admin)}"?`
      );
      if (!ok) return;
      try {
        setBusyAdminId(admin.id);
        const result = await deleteAdminAction(admin.id);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Admin deactivated");
        router.push("/dashboard/admins");
      } finally {
        setBusyAdminId(null);
      }
    },
    [busyAdminId, router]
  );

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
              <span>Admin</span>
              <StitchMaterialIcon icon="chevron_right" className="text-[10px]" />
              <span className="text-stitch-primary font-bold">Admins</span>
            </nav>
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface">Admins</h2>
          </div>
          <button
            className="bg-gradient-to-br from-stitch-primary to-stitch-primary-dim text-stitch-on-primary px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-stitch-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            onClick={() => setCreateOpen(true)}
          >
            <StitchMaterialIcon icon="add" className="text-sm" />
            Create Admin
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Admins</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.total.toLocaleString()}</span>
              <span className="text-xs font-medium text-green-600 flex items-center">+0%</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Active Now</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.active.toLocaleString()}</span>
              <span className="text-xs font-medium text-blue-600 flex items-center">Live</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Inactive</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.inactive.toLocaleString()}</span>
              <span className="text-xs font-medium text-orange-500 flex items-center">—</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Expired</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.expired.toLocaleString()}</span>
              <span className="text-xs font-medium text-rose-600 flex items-center">Soon</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
          <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-surface-container">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span
                  className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base"
                  data-icon="search"
                >
                  search
                </span>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 pr-4 py-2 bg-surface-container-low text-xs font-semibold rounded-lg hover:bg-surface-container transition-colors flex items-center gap-2 w-[280px]"
                  placeholder="Search admins…"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={status === "all" ? "px-3 py-1.5 rounded-full text-xs font-semibold bg-stitch-primary text-stitch-on-primary" : "px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"}
                  onClick={() => {
                    setStatus("all");
                    setPage(1);
                  }}
                >
                  All
                </button>
                <button
                  type="button"
                  className={status === "active" ? "px-3 py-1.5 rounded-full text-xs font-semibold bg-stitch-primary text-stitch-on-primary" : "px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"}
                  onClick={() => {
                    setStatus("active");
                    setPage(1);
                  }}
                >
                  Active
                </button>
                <button
                  type="button"
                  className={status === "inactive" ? "px-3 py-1.5 rounded-full text-xs font-semibold bg-stitch-primary text-stitch-on-primary" : "px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"}
                  onClick={() => {
                    setStatus("inactive");
                    setPage(1);
                  }}
                >
                  Inactive
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="text-xs font-medium">
                Showing {showingCount} of {filteredSorted.length} results
              </span>
              <select
                value={sortKey}
                onChange={(e) => {
                  setSortKey(e.target.value as AdminSortKey);
                  setPage(1);
                }}
                className="bg-surface-container-low text-xs font-semibold rounded-lg px-3 py-2 border border-outline-variant/10"
                aria-label="Sort admins"
              >
                <option value="granted_at">Created date</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
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
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {pagedAdmins.map((admin) => {
                  const expired = admin.is_active && isExpired(admin.expires_at);
                  const isSelf = currentUserId ? admin.user_id === currentUserId : false;
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
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="text-on-surface-variant hover:text-stitch-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                              disabled={!!busyAdminId && busyAdminId !== admin.id}
                              aria-label="Admin actions"
                            >
                              <StitchMaterialIcon icon="more_horiz" className="text-lg" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[220px] bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-1 shadow-lg">
                            <DropdownMenuItem
                              className="text-xs font-semibold text-on-surface-variant px-3 py-2 rounded-lg hover:bg-surface-container-high focus:outline-none"
                              onSelect={() => {
                                router.push(`/dashboard/admins/${admin.id}`);
                              }}
                            >
                              View details
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="text-xs font-semibold text-on-surface-variant px-3 py-2 rounded-lg hover:bg-surface-container-high focus:outline-none"
                              disabled={isSelf || expired}
                              onSelect={() => {
                                void handleToggleActive(admin);
                              }}
                            >
                              {admin.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="text-xs font-semibold text-error px-3 py-2 rounded-lg hover:bg-error/10 focus:outline-none"
                              disabled={isSelf}
                              onSelect={() => {
                                void handleDeactivate(admin);
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-white border-t border-surface-container flex items-center justify-between">
            <button
              className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <StitchMaterialIcon icon="chevron_left" className="text-sm" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 3).map((p) => (
                <button
                  key={p}
                  className={cx(
                    "w-8 h-8 flex items-center justify-center text-xs rounded-lg transition-colors",
                    p === page
                      ? "font-bold bg-stitch-primary text-stitch-on-primary shadow-md shadow-stitch-primary/20"
                      : "font-medium hover:bg-surface-container-low"
                  )}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              {totalPages > 3 ? (
                <span className="px-2 text-on-surface-variant">…</span>
              ) : null}
            </div>

            <button
              className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <StitchMaterialIcon icon="chevron_right" className="text-sm" />
            </button>
          </div>
        </div>

        <CreateAdminModal open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </div>
  );
}

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}


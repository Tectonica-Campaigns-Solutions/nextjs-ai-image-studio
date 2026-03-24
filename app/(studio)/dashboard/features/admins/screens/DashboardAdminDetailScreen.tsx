"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Admin } from "@/app/(studio)/dashboard/utils/types";
import { DashboardMaterialIcon } from "@/app/(studio)/dashboard/components/DashboardMaterialIcon";
import { DashboardBreadcrumb } from "@/app/(studio)/dashboard/components/dashboard-breadcrumb";
import { updateAdminAction, deleteAdminAction } from "../actions/admins";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/app/(studio)/dashboard/components/confirm-dialog";
import { useServerAction } from "@/app/(studio)/dashboard/hooks/use-server-action";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type DashboardAdminDetailScreenProps = Readonly<{
  admin: Admin;
  currentUserId: string | null;
}>;

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function statusMeta(admin: Admin) {
  const expired = admin.is_active && isExpired(admin.expires_at);
  if (!admin.is_active) {
    return { label: "Inactive", pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  }
  if (expired) {
    return { label: "Expired", pill: "bg-amber-100 text-amber-700", dot: "bg-amber-500" };
  }
  return { label: "Active", pill: "bg-green-100 text-green-700", dot: "bg-green-500" };
}

function displayName(admin: Admin) {
  const dn = admin.display_name?.trim();
  if (dn) return dn;
  if (admin.email && admin.email !== "N/A") return admin.email;
  return "Admin";
}

export function DashboardAdminDetailScreen({
  admin,
  currentUserId,
}: DashboardAdminDetailScreenProps) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const deactivateAction = useServerAction();

  const [name, setName] = useState(admin.display_name ?? "");
  const [isActive, setIsActive] = useState(admin.is_active);
  const [expiresAt, setExpiresAt] = useState(
    admin.expires_at ? admin.expires_at.slice(0, 16) : ""
  );

  const isSelf = useMemo(() => {
    return currentUserId ? admin.user_id === currentUserId : false;
  }, [currentUserId, admin.user_id]);

  const meta = statusMeta(admin);

  const showExpiration = !admin.is_active;

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const payload: {
        display_name?: string | null;
        is_active?: boolean;
        expires_at?: string | null;
      } = {
        display_name: name.trim() ? name.trim() : null,
      };

      if (!isSelf) {
        payload.is_active = isActive;
      }

      if (showExpiration) {
        payload.expires_at = expiresAt.trim() ? expiresAt.trim() : null;
      }

      const result = await updateAdminAction(admin.id, payload);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Admin updated");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = () => {
    void deactivateAction.execute(
      admin.id,
      deleteAdminAction,
      [admin.id],
      "Admin deactivated",
      () => {
        setDeactivateConfirmOpen(false);
        router.push("/dashboard/admins");
      },
    );
  };

  return (
    <div className="pt-16 min-h-screen bg-surface">
      <div className="px-10 py-10 space-y-8">
        <ConfirmDialog
          open={deactivateConfirmOpen}
          onOpenChange={(open) => { if (!deactivateAction.busyId) setDeactivateConfirmOpen(open); }}
          title="Deactivate admin"
          description={`Deactivate "${displayName(admin)}"? This can be reversed by editing the admin.`}
          actionLabel="Deactivate"
          busyLabel="Deactivating..."
          busy={deactivateAction.busyId !== null}
          onConfirm={handleDeactivate}
        />

        <div className="flex items-end justify-between mb-10">
          <div>
            <DashboardBreadcrumb segments={[
              { label: "Admins", href: "/dashboard/admins" },
              { label: displayName(admin) },
            ]} />
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface">
              Admin Detail
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-7 space-y-6">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                    Overview
                  </p>
                  <h3 className="text-2xl font-bold text-on-surface leading-tight">
                    {displayName(admin)}
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-1">
                    {admin.email}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${meta.pill}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                    Role
                  </p>
                  <p className="text-sm font-semibold text-on-surface">{admin.role}</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-4">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                    Created
                  </p>
                  <p className="text-sm font-semibold text-on-surface">{new Date(admin.granted_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="admin-name">
                    Display name
                  </label>
                  <Input
                    id="admin-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={saving}
                    className="dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none"
                    placeholder="Display name"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-surface-container-low border border-outline-variant/10 p-4">
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                      Active status
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      The admin will be able to access the dashboard
                    </p>
                  </div>
                  <Switch
                    id="admin-active"
                    checked={isActive}
                    disabled={saving || isSelf}
                    onCheckedChange={(checked) => setIsActive(checked)}
                    className="data-[state=checked]:bg-dashboard-primary data-[state=unchecked]:bg-surface-container-high focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
                  />
                </div>

                {showExpiration ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest" htmlFor="admin-expires">
                      Expiration date (optional)
                    </label>
                    <Input
                      id="admin-expires"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      disabled={saving}
                      className="dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none"
                    />
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-outline-variant/10 pt-6">
                <button
                  type="button"
                  className="text-error font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
                  disabled={saving || deactivateAction.busyId !== null || isSelf}
                  onClick={() => setDeactivateConfirmOpen(true)}
                >
                  Deactivate
                </button>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    className="hidden"
                  >
                    Cancel
                  </Button>
                  <button
                    type="button"
                    className="bg-dashboard-primary text-dashboard-on-primary px-6 py-2 rounded-lg text-sm font-bold shadow-sm shadow-dashboard-primary/20 hover:opacity-90 transition-all disabled:opacity-70"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                Admin actions
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
                  onClick={() => router.push(`/dashboard/admins/${admin.id}`)}
                  disabled
                >
                  Edit details
                </button>
                <button
                  type="button"
                  className="w-full bg-error/10 border border-error/20 rounded-xl py-2.5 text-sm font-bold text-error hover:bg-error/20 transition-colors disabled:opacity-50"
                  onClick={() => setDeactivateConfirmOpen(true)}
                  disabled={isSelf || saving || deactivateAction.busyId !== null}
                >
                  {deactivateAction.busyId ? "Deactivating..." : "Deactivate admin"}
                </button>
              </div>

              <div className="mt-4 text-xs text-on-surface-variant leading-relaxed">
                {admin.granted_by_email ? (
                  <p>
                    Granted by <span className="font-semibold">{admin.granted_by_email}</span>
                  </p>
                ) : (
                  <p>No grant information</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


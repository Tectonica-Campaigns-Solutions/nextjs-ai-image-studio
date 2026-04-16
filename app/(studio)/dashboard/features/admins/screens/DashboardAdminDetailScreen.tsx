"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast as sonnerToast } from "sonner";
import { toast as uiToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import type { Admin } from "@/app/(studio)/dashboard/utils/types";
import { DashboardBreadcrumb } from "@/app/(studio)/dashboard/components/dashboard-breadcrumb";
import {
  changeMyPasswordAction,
  deleteAdminAction,
  updateAdminAction,
} from "../actions/admins";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/app/(studio)/dashboard/components/confirm-dialog";
import { useServerAction } from "@/app/(studio)/dashboard/hooks/use-server-action";
import { DashboardStatusPill } from "@/app/(studio)/dashboard/components/dashboard-status-pill";

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
    return { label: "Inactive", tone: "muted" as const };
  }
  if (expired) {
    return { label: "Expired", tone: "warning" as const };
  }
  return { label: "Active", tone: "success" as const };
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

  const [pwBusy, setPwBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        sonnerToast.error(result.error);
        return;
      }
      sonnerToast.success("Admin updated");
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

  const handleChangePassword = async () => {
    if (!isSelf || pwBusy) return;
    try {
      setPwBusy(true);
      setPwError(null);
      setPwSuccess(null);
      const result = await changeMyPasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (result.error) {
        sonnerToast.error(result.error);
        setPwError(result.error);
        return;
      }
      uiToast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      setPwSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      router.refresh();
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="pt-16 min-h-screen bg-surface">
      <div className="px-10 py-10 space-y-8">
        <ConfirmDialog
          open={deactivateConfirmOpen}
          onOpenChange={(open) => {
            if (!deactivateAction.busyId) setDeactivateConfirmOpen(open);
          }}
          title="Delete admin"
          description={`Delete "${displayName(admin)}"? This will remove their admin access to the dashboard.`}
          actionLabel="Delete"
          busyLabel="Deleting..."
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

        <div className="grid grid-cols-12 items-stretch gap-8">
          <div className="col-span-12 lg:col-span-7 flex flex-col">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 flex-1 h-full">
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
                <DashboardStatusPill tone={meta.tone} label={meta.label} />
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

              <div className="mt-6 flex items-center justify-end border-t border-outline-variant/10 pt-6">
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

          <div className="col-span-12 lg:col-span-5 flex flex-col">
            {isSelf ? (
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-6 flex-1 h-full flex flex-col">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                      Security
                    </p>
                    <h3 className="text-2xl font-bold text-on-surface leading-tight">
                      Change password
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                      Use your current password to confirm this change.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      className="text-xs font-bold text-on-surface-variant uppercase tracking-widest"
                      htmlFor="admin-current-password"
                    >
                      Current password
                    </label>
                    <div className="relative">
                      <Input
                        id="admin-current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          if (pwError) setPwError(null);
                          if (pwSuccess) setPwSuccess(null);
                        }}
                        disabled={pwBusy}
                        className="dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 pr-12 shadow-none"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        aria-label={
                          showCurrentPassword
                            ? "Hide current password"
                            : "Show current password"
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-on-surface-variant hover:text-on-surface disabled:opacity-50"
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        disabled={pwBusy}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-xs font-bold text-on-surface-variant uppercase tracking-widest"
                      htmlFor="admin-new-password"
                    >
                      New password
                    </label>
                    <div className="relative">
                      <Input
                        id="admin-new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (pwError) setPwError(null);
                          if (pwSuccess) setPwSuccess(null);
                        }}
                        disabled={pwBusy}
                        className="dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 pr-12 shadow-none"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        aria-label={
                          showNewPassword ? "Hide new password" : "Show new password"
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-on-surface-variant hover:text-on-surface disabled:opacity-50"
                        onClick={() => setShowNewPassword((v) => !v)}
                        disabled={pwBusy}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-xs font-bold text-on-surface-variant uppercase tracking-widest"
                      htmlFor="admin-confirm-password"
                    >
                      Confirm new password
                    </label>
                    <div className="relative">
                      <Input
                        id="admin-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (pwError) setPwError(null);
                          if (pwSuccess) setPwSuccess(null);
                        }}
                        disabled={pwBusy}
                        className="dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 pr-12 shadow-none"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-on-surface-variant hover:text-on-surface disabled:opacity-50"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        disabled={pwBusy}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {pwError ? (
                  <p className="mt-4 text-sm font-semibold text-error">{pwError}</p>
                ) : null}
                {pwSuccess ? (
                  <p className="mt-4 text-sm font-semibold text-green-600">
                    {pwSuccess}
                  </p>
                ) : null}

                <div className="mt-auto flex items-center justify-end border-t border-outline-variant/10 pt-6">
                  <button
                    type="button"
                    className="bg-dashboard-primary text-dashboard-on-primary px-6 py-2 rounded-lg text-sm font-bold shadow-sm shadow-dashboard-primary/20 hover:opacity-90 transition-all disabled:opacity-70"
                    onClick={handleChangePassword}
                    disabled={pwBusy}
                  >
                    {pwBusy ? "Updating..." : "Update password"}
                  </button>
                </div>
              </div>
            ) : null}

            {!isSelf ? (
              <div className="bg-surface-container-lowest rounded-xl border border-error/20 p-6 flex-1 h-full flex flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                      Danger zone
                    </p>
                    <h3 className="text-2xl font-bold text-on-surface leading-tight">
                      Remove admin access
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                      This will deactivate the admin role and remove dashboard access.
                    </p>
                  </div>
                </div>

                <div className="mt-4 text-xs text-on-surface-variant leading-relaxed">
                  {admin.granted_by_email ? (
                    <p>
                      Granted by{" "}
                      <span className="font-semibold">{admin.granted_by_email}</span>
                    </p>
                  ) : (
                    <p>No grant information</p>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-end border-t border-error/20 pt-6">
                  <button
                    type="button"
                    className="bg-error/10 border border-error/20 rounded-xl px-5 py-2.5 text-sm font-bold text-error hover:bg-error/20 transition-colors disabled:opacity-50"
                    onClick={() => setDeactivateConfirmOpen(true)}
                    disabled={saving || deactivateAction.busyId !== null}
                  >
                    {deactivateAction.busyId ? "Deleting..." : "Delete admin"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


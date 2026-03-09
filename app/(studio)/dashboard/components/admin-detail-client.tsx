"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Trash2, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Admin } from "@/app/(studio)/dashboard/types";
import { updateAdminAction, deleteAdminAction, setAdminPasswordAction } from "@/app/(studio)/dashboard/actions/admins";

interface AdminDetailClientProps {
  admin: Admin;
  currentUserId: string | null;
}

export function AdminDetailClient({ admin, currentUserId }: AdminDetailClientProps) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(admin.is_active);
  const [displayName, setDisplayName] = useState(admin.display_name ?? "");
  const [expiresAt, setExpiresAt] = useState(
    admin.expires_at ? new Date(admin.expires_at).toISOString().slice(0, 16) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const isCurrentUser = admin.user_id === currentUserId;
  const showExpiration = !admin.is_active;
  const canEditRoleAndSave = !isCurrentUser || showExpiration;
  const canSave = canEditRoleAndSave || displayName !== (admin.display_name ?? "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (expiresAt) {
      const expiresDate = new Date(expiresAt);
      if (isNaN(expiresDate.getTime())) {
        setError("Expiration date is not valid");
        return;
      }
      if (expiresDate <= new Date()) {
        setError("Expiration date must be in the future");
        return;
      }
    }
    setSaving(true);
    const payload: Parameters<typeof updateAdminAction>[1] = {
      display_name: displayName.trim() || null,
    };
    if (showExpiration) payload.expires_at = expiresAt || null;
    if (!isCurrentUser) payload.is_active = isActive;
    const result = await updateAdminAction(admin.id, payload);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordSaving(true);
    const result = await setAdminPasswordAction(admin.user_id, {
      password,
      confirmPassword,
    });
    setPasswordSaving(false);
    if (result.error) {
      setPasswordError(result.error);
      return;
    }
    setShowPasswordDialog(false);
    setPassword("");
    setConfirmPassword("");
    router.refresh();
  };

  const handleConfirmDeactivate = async () => {
    const result = await deleteAdminAction(admin.id);
    if (result.error) {
      setError(result.error);
      setShowDeactivateDialog(false);
      return;
    }
    setShowDeactivateDialog(false);
    router.push("/dashboard/admins");
  };

  return (
    <>
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate this admin? This action can be reversed by editing the admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="min-h-dvh bg-background">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/admins")}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-1 text-balance">
              Admin details
            </h1>
            <p className="text-muted-foreground text-sm text-pretty">
              View and edit the admin information
            </p>
          </div>

          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Information</h2>
            <div className="space-y-3">
              {admin.display_name && (
                <div>
                  <Label className="text-muted-foreground text-xs">Name</Label>
                  <p className="text-sm font-medium mt-1">{admin.display_name}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p className="text-sm font-medium mt-1">{admin.email}</p>
              </div>
              {admin.granted_by_email && (
                <div>
                  <Label className="text-muted-foreground text-xs">Created by</Label>
                  <p className="text-sm font-medium mt-1">
                    {admin.granted_by_email}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground text-xs">Creation date</Label>
                <p className="text-sm font-medium mt-1 tabular-nums">
                  {new Date(admin.granted_at).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 mb-6">
            <form onSubmit={handleSave} className="space-y-6">
              {error && (
                <div
                  className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {isCurrentUser && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                  You cannot change your own active status or deactivate yourself.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="display_name">Name</Label>
                <Input
                  id="display_name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  maxLength={256}
                />
                <p className="text-muted-foreground text-xs">
                  Shown in the admin list. Stored in your Supabase Auth profile.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                <div>
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Active status
                  </Label>
                  <p className="text-muted-foreground mt-1 text-xs">
                    The admin will be able to access the dashboard
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  disabled={isCurrentUser}
                />
              </div>

              {showExpiration && (
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Expiration date (optional)</Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Leave empty for permanent access.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between border-t pt-6">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeactivateDialog(true)}
                  disabled={isCurrentUser}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Deactivate admin
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard/admins")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || !canSave}
                    className="min-w-[120px] gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        Saving…
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Card>

          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-2">Password</h2>
            <p className="text-muted-foreground text-sm mb-4">
              {isCurrentUser
                ? "Change your own password."
                : "Set or change this admin's password."}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPasswordError(null);
                setPassword("");
                setConfirmPassword("");
                setShowPasswordDialog(true);
              }}
              className="gap-2"
            >
              <KeyRound className="size-4" aria-hidden />
              Set new password
            </Button>
          </Card>
        </div>
      </div>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set new password</DialogTitle>
            <DialogDescription>
              {isCurrentUser
                ? "Enter your new password below."
                : `Set a new password for ${admin.email}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSetPassword} className="space-y-4">
            {passwordError && (
              <div
                className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {passwordError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm password</Label>
              <Input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPasswordDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={passwordSaving} className="gap-2">
                {passwordSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Set password"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

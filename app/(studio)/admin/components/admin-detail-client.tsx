"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Admin } from "@/app/(studio)/admin/types";
import { updateAdminAction, deleteAdminAction } from "@/app/(studio)/admin/actions/admins";

interface AdminDetailClientProps {
  admin: Admin;
  currentUserId: string | null;
}

export function AdminDetailClient({ admin, currentUserId }: AdminDetailClientProps) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(admin.is_active);
  const [expiresAt, setExpiresAt] = useState(
    admin.expires_at ? new Date(admin.expires_at).toISOString().slice(0, 16) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrentUser = admin.user_id === currentUserId;

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
    const result = await updateAdminAction(admin.id, {
      is_active: isActive,
      expires_at: expiresAt || null,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to deactivate the admin ${admin.email}? This action can be reversed by editing the admin.`
      )
    )
      return;
    const result = await deleteAdminAction(admin.id);
    if (result.error) {
      setError(result.error);
      alert(result.error);
      return;
    }
    router.push("/admin/admins");
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/admins")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Admin Details
          </h1>
          <p className="text-sm text-gray-500">
            View and edit the admin information
          </p>
        </div>

        <Card className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información</h2>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-500">Email</Label>
              <p className="text-sm font-medium text-gray-900 mt-1">{admin.email}</p>
            </div>
            {admin.granted_by_email && (
              <div>
                <Label className="text-xs text-gray-500">Created by</Label>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {admin.granted_by_email}
                </p>
              </div>
            )}
            <div>
              <Label className="text-xs text-gray-500">Creation Date</Label>
              <p className="text-sm font-medium text-gray-900 mt-1">
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

        <Card className="bg-white rounded-lg border border-gray-200 p-8">
          <form onSubmit={handleSave} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {isCurrentUser && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                You cannot modify your own admin status
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label
                  htmlFor="is_active"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Active Status
                </Label>
                <p className="text-xs text-gray-500 mt-1">
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

            <div className="space-y-2">
              <Label
                htmlFor="expires_at"
                className="text-sm font-medium text-gray-700"
              >
                Expiration Date (Optional)
              </Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="border-gray-200 focus:border-gray-400 focus:ring-gray-400"
                min={new Date().toISOString().slice(0, 16)}
                disabled={isCurrentUser}
              />
              <p className="text-xs text-gray-500 mt-1">
                The admin access will expire on this date. Leave empty for
                permanent access.
              </p>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isCurrentUser}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deactivate Admin
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/admins")}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || isCurrentUser}
                  className="bg-gray-900 text-white hover:bg-gray-800 min-w-[120px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

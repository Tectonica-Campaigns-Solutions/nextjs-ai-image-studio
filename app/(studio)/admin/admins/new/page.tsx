"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdminAction } from "@/app/(studio)/admin/actions/admins";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function NewAdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Email is not valid");
      return;
    }

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

    try {
      setSaving(true);
      const result = await createAdminAction({
        email: email.trim(),
        expires_at: expiresAt || null,
      });
      if (result.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
      // createAdminAction redirects on success
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error creating admin"
      );
      setSaving(false);
    }
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
            New Admin
          </h1>
          <p className="text-sm text-gray-500">
            Invite a a new admin. An email invitation will be sent to the admin to set their password.
          </p>
        </div>

        <Card className="bg-white rounded-lg border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ejemplo.com"
                required
                className="border-gray-200 focus:border-gray-400 focus:ring-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                An email invitation will be sent to this address
              </p>
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
              />
              <p className="text-xs text-gray-500 mt-1">
                The admin access will expire on this date. Leave empty for
                permanent access.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
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
                disabled={saving}
                className="bg-gray-900 text-white hover:bg-gray-800 min-w-[120px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

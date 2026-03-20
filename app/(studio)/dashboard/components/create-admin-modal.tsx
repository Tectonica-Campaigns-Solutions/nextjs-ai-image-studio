"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createAdminAction } from "@/app/(studio)/dashboard/features/admins/actions/admins";
import { cn } from "@/lib/utils";

interface CreateAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAdminModal({ open, onOpenChange }: CreateAdminModalProps) {
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
        return;
      }
      onOpenChange(false);
      setEmail("");
      setExpiresAt("");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error creating admin"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setError(null);
      setEmail("");
      setExpiresAt("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-lg",
          "bg-surface-container-lowest/95 backdrop-blur-md",
          "border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5",
          "max-h-[90dvh] overflow-y-auto"
        )}
        showCloseButton
      >
        <DialogHeader className="mb-4 pb-4 border-b border-outline-variant/10">
          <DialogTitle className="text-2xl font-extrabold tracking-tight text-on-surface">
            New Admin
          </DialogTitle>
          <DialogDescription className="text-on-surface-variant">
            Invite a new admin. An email invitation will be sent for them to set their password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div
              id="create-admin-error"
              className="rounded-xl border border-error/20 bg-error/10 p-3 text-sm text-error"
              role="alert"
            >
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="create-admin-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              aria-invalid={!!error}
              aria-describedby={error ? "create-admin-error" : undefined}
              className={cn(
                "dashboard-input",
                "!bg-surface-container-low !border-outline-variant/10",
                "rounded-xl px-4 shadow-none",
                "focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
              )}
              disabled={saving}
            />
            <p className="text-muted-foreground text-xs">
              An email invitation will be sent to this address.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-admin-expires_at">
              Expiration date (optional)
            </Label>
            <Input
              id="create-admin-expires_at"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              disabled={saving}
              className={cn(
                "dashboard-input",
                "!bg-surface-container-low !border-outline-variant/10",
                "rounded-xl px-4 shadow-none",
                "focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
              )}
            />
            <p className="text-muted-foreground text-xs">
              Leave empty for permanent access.
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
              className="bg-surface-container-lowest border-outline-variant/10 hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="gap-2 bg-dashboard-primary text-dashboard-on-primary border border-dashboard-primary/10 hover:opacity-90 shadow-sm shadow-dashboard-primary/20 disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Sending…
                </>
              ) : (
                "Send invitation"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

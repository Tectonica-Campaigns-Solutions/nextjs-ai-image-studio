"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createAdminAction } from "@/app/(studio)/dashboard/features/admins/actions/admins";
import { DashboardDialogContent } from "@/app/(studio)/dashboard/components/dashboard-dialog-content";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createAdminSchema,
  type CreateAdminInput,
} from "@/app/(studio)/dashboard/features/admins/schemas/admins";

interface CreateAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAdminModal({ open, onOpenChange }: CreateAdminModalProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAdminInput>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: { email: "", expires_at: "" },
  });

  const onSubmit = async (data: CreateAdminInput) => {
    setError(null);

    try {
      setSaving(true);
      const parsed = createAdminSchema.safeParse(data);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Invalid input");
        return;
      }
      const result = await createAdminAction({
        email: parsed.data.email,
        expires_at: parsed.data.expires_at,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      reset({ email: "", expires_at: "" });
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
      reset({ email: "", expires_at: "" });
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DashboardDialogContent className="max-h-[90dvh]">
        <DialogHeader className="mb-4 pb-4 border-b border-outline-variant/10">
          <DialogTitle className="text-2xl font-extrabold tracking-tight text-on-surface">
            New Admin
          </DialogTitle>
          <DialogDescription className="text-on-surface-variant">
            Invite a new admin. An email invitation will be sent for them to set their password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
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
              {...register("email")}
              placeholder="admin@example.com"
              required
              aria-invalid={!!errors.email || !!error}
              aria-describedby={error ? "create-admin-error" : undefined}
              className="dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
              disabled={saving}
            />
            {errors.email?.message ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
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
              {...register("expires_at")}
              min={new Date().toISOString().slice(0, 16)}
              disabled={saving}
              className="dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
            />
            {errors.expires_at?.message ? (
              <p className="text-sm text-destructive">{errors.expires_at.message}</p>
            ) : null}
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
              className="gap-2 bg-dashboard-primary text-dashboard-on-primary border border-dashboard-primary/10 hover:bg-dashboard-primary/90 hover:text-dashboard-on-primary shadow-sm shadow-dashboard-primary/20 disabled:opacity-70"
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
      </DashboardDialogContent>
    </Dialog>
  );
}

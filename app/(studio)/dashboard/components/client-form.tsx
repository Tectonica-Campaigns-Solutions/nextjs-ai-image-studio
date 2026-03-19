"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createClientSchema,
  type CreateClientInput,
} from "@/app/(studio)/dashboard/schemas/clients";

interface ClientFormProps {
  clientId?: string;
  initialData?: {
    ca_user_id?: string;
    name?: string;
    email?: string;
    description?: string;
    is_active?: boolean;
    allow_custom_logo?: boolean;
  };
  onSave: (data: {
    ca_user_id: string;
    name: string;
    email: string;
    description?: string;
    is_active: boolean;
    allow_custom_logo: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
}

export function ClientForm({
  clientId,
  initialData,
  onSave,
  onCancel,
}: ClientFormProps) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      ca_user_id: initialData?.ca_user_id ?? "",
      name: initialData?.name ?? "",
      email: initialData?.email ?? "",
      description: initialData?.description ?? "",
      is_active: initialData?.is_active ?? true,
      allow_custom_logo: initialData?.allow_custom_logo ?? true,
    },
  });

  const isActive = watch("is_active");
  const allowCustomLogo = watch("allow_custom_logo");

  const onSubmit = async (data: CreateClientInput) => {
    try {
      setSaving(true);
      await onSave({
        ca_user_id: data.ca_user_id,
        name: data.name,
        email: data.email,
        description: data.description ?? undefined,
        is_active: data.is_active ?? true,
        allow_custom_logo: data.allow_custom_logo ?? true,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error saving client"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("rounded-none border-none bg-transparent p-0")}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="ca_user_id">
            CA User ID <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ca_user_id"
            {...register("ca_user_id")}
            placeholder="ID of the user in Change Agent"
            disabled={!!clientId || saving}
            autoFocus={!clientId}
            className={cn(
              "stitch-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none",
              "focus-visible:ring-stitch-primary/20 focus-visible:border-stitch-primary",
              clientId && "bg-muted text-muted-foreground"
            )}
            aria-invalid={!!errors.ca_user_id}
          />
          {errors.ca_user_id && (
            <p className="text-sm text-destructive">
              {errors.ca_user_id.message}
            </p>
          )}
          {clientId && (
            <p className="text-muted-foreground mt-1 text-xs">
              The CA User ID cannot be modified
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="Name of the client"
            disabled={saving}
            aria-invalid={!!errors.name}
            className="stitch-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none focus-visible:ring-stitch-primary/20 focus-visible:border-stitch-primary"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="email@example.com"
            disabled={saving}
            aria-invalid={!!errors.email}
            className="stitch-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none focus-visible:ring-stitch-primary/20 focus-visible:border-stitch-primary"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Description of the client (optional)"
            rows={4}
            disabled={saving}
            className="resize-none bg-surface-container-low border-outline-variant/10 rounded-xl shadow-none focus-visible:ring-stitch-primary/20 focus-visible:border-stitch-primary"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-surface-container-low border border-outline-variant/10 p-4">
          <div>
            <Label htmlFor="is_active" className="cursor-pointer">
              Active status
            </Label>
            <p className="text-muted-foreground mt-1 text-xs">
              The client will be available to use its assets and fonts
            </p>
          </div>
          <Switch
            id="is_active"
            checked={isActive}
            onCheckedChange={(checked) => setValue("is_active", checked)}
            disabled={saving}
            className="data-[state=checked]:bg-stitch-primary data-[state=unchecked]:bg-surface-container-high data-[state=checked]:dark:bg-stitch-primary data-[state=unchecked]:dark:bg-surface-container-high focus-visible:ring-stitch-primary/20 focus-visible:border-stitch-primary"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-surface-container-low border border-outline-variant/10 p-4">
          <div>
            <Label htmlFor="allow_custom_logo" className="cursor-pointer">
              Allow custom logo upload
            </Label>
            <p className="text-muted-foreground mt-1 text-xs">
              When enabled, users can upload their own logo in the studio under
              Logo overlay
            </p>
          </div>
          <Switch
            id="allow_custom_logo"
            checked={allowCustomLogo}
            onCheckedChange={(checked) => setValue("allow_custom_logo", checked)}
            disabled={saving}
            className="data-[state=checked]:bg-stitch-primary data-[state=unchecked]:bg-surface-container-high data-[state=checked]:dark:bg-stitch-primary data-[state=unchecked]:dark:bg-surface-container-high focus-visible:ring-stitch-primary/20 focus-visible:border-stitch-primary"
          />
        </div>

        <div className="flex justify-end gap-3 border-t pt-6">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
              className="bg-surface-container-lowest border-outline-variant/10 hover:bg-surface-container-high hover:text-on-surface disabled:opacity-50"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={saving}
            className="min-w-[140px] gap-2 bg-stitch-primary text-stitch-on-primary border border-stitch-primary/10 hover:opacity-90 shadow-sm shadow-stitch-primary/20 disabled:opacity-70"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

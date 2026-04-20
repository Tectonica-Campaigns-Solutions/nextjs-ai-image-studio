"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createClientSchema,
  type CreateClientInput,
} from "@/app/(studio)/dashboard/features/clients/schemas/clients";

type PlanOption = {
  id: string;
  code: string;
  name: string;
  images_limit: number;
};

interface ClientFormProps {
  clientId?: string;
  initialData?: {
    ca_user_id?: string;
    name?: string;
    email?: string;
    description?: string;
    plan_id?: string | null;
    is_active?: boolean;
    allow_custom_logo?: boolean;
  };
  onSave: (data: {
    ca_user_id: string;
    name: string;
    email: string;
    description?: string;
    plan_id?: string | null;
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
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

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
      plan_id: initialData?.plan_id ?? null,
      is_active: initialData?.is_active ?? true,
      allow_custom_logo: initialData?.allow_custom_logo ?? true,
    },
  });

  const isActive = watch("is_active");
  const allowCustomLogo = watch("allow_custom_logo");
  const planId = watch("plan_id");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setPlansLoading(true);
        const res = await fetch("/api/dashboard/plans", { method: "GET" });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error ?? "Failed to fetch plans");
        }
        const rows = (json?.plans ?? []) as PlanOption[];
        if (!cancelled) setPlans(rows);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Failed to load plans"
          );
          setPlans([]);
        }
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const planSelectItems = useMemo(() => {
    return plans.map((p) => {
      const limitLabel = p.images_limit === 0 ? "Unlimited" : `${p.images_limit}`;
      return {
        value: p.id,
        label: `${p.name} (${limitLabel})`,
      };
    });
  }, [plans]);

  const onSubmit = async (data: CreateClientInput) => {
    try {
      setSaving(true);
      await onSave({
        ca_user_id: data.ca_user_id,
        name: data.name,
        email: data.email,
        description: data.description ?? undefined,
        plan_id: data.plan_id ?? null,
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
              "dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none",
              "focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary",
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
            className="dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
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
            className="dashboard-input !bg-surface-container-low !border-outline-variant/10 rounded-xl px-4 shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
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
            className="resize-none bg-surface-container-low border-outline-variant/10 rounded-xl shadow-none focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="plan_id">Plan</Label>
          <Select
            value={planId ?? ""}
            onValueChange={(value) =>
              setValue(
                "plan_id",
                value && value !== "__no_plans__" ? value : null,
                { shouldValidate: true }
              )
            }
            disabled={saving || plansLoading}
          >
            <SelectTrigger
              id="plan_id"
              className={cn(
                "dashboard-input rounded-xl px-4 shadow-none w-full bg-surface-container-low",
                " !border-outline-variant/10",
                "focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary",
              )}
            >
              <SelectValue
                placeholder={plansLoading ? "Loading plans…" : "Select a plan"}
              />
            </SelectTrigger>
            <SelectContent className="bg-surface-container-lowest border-outline-variant/10">
              {planSelectItems.length > 0 ? (
                planSelectItems.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__no_plans__" disabled>
                  No plans available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {errors.plan_id && (
            <p className="text-sm text-destructive">
              {errors.plan_id.message as string}
            </p>
          )}
          <p className="text-muted-foreground mt-1 text-xs">
            Trial plans can be capped; Full can be unlimited (0). Manage plans in
            {" "}
            <a
              href="/dashboard/plans"
              className="underline underline-offset-2 hover:text-on-surface"
            >
              Plans
            </a>
            .
          </p>
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
            className="data-[state=checked]:bg-dashboard-primary data-[state=unchecked]:bg-surface-container-high data-[state=checked]:dark:bg-dashboard-primary data-[state=unchecked]:dark:bg-surface-container-high focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
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
            className="data-[state=checked]:bg-dashboard-primary data-[state=unchecked]:bg-surface-container-high data-[state=checked]:dark:bg-dashboard-primary data-[state=unchecked]:dark:bg-surface-container-high focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary"
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
            className="min-w-[140px] gap-2 bg-dashboard-primary text-dashboard-on-primary border border-dashboard-primary/10 hover:bg-dashboard-primary/90 hover:text-dashboard-on-primary shadow-sm shadow-dashboard-primary/20 disabled:opacity-70"
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

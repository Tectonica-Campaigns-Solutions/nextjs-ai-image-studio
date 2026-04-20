"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createPlanSchema,
  type CreatePlanInput,
} from "@/app/(studio)/dashboard/features/plans/schemas/plans";

export function PlanForm(props: {
  initialData?: Partial<CreatePlanInput>;
  onSave: (data: CreatePlanInput) => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
}) {
  const saving = props.saving === true;
  const { register, handleSubmit, formState } = useForm<CreatePlanInput>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      code: props.initialData?.code ?? "",
      name: props.initialData?.name ?? "",
      images_limit:
        typeof props.initialData?.images_limit === "number"
          ? props.initialData.images_limit
          : 0,
    },
  });

  return (
    <form onSubmit={handleSubmit(props.onSave)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          placeholder="trial"
          disabled={saving}
          {...register("code")}
          aria-invalid={!!formState.errors.code}
          className={cn(
            "dashboard-input rounded-xl px-4 shadow-none",
            "!bg-surface-container-lowest !border-outline-variant/10",
            "focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary",
          )}
        />
        {formState.errors.code?.message ? (
          <p className="text-sm text-destructive">{formState.errors.code.message}</p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          Lowercase, numbers, underscores only.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="Trial"
          disabled={saving}
          {...register("name")}
          aria-invalid={!!formState.errors.name}
          className={cn(
            "dashboard-input rounded-xl px-4 shadow-none",
            "!bg-surface-container-lowest !border-outline-variant/10",
            "focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary",
          )}
        />
        {formState.errors.name?.message ? (
          <p className="text-sm text-destructive">{formState.errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="images_limit">Images limit</Label>
        <Input
          id="images_limit"
          type="number"
          min={0}
          step={1}
          placeholder="20"
          disabled={saving}
          {...register("images_limit")}
          aria-invalid={!!formState.errors.images_limit}
          className={cn(
            "dashboard-input rounded-xl px-4 shadow-none",
            "!bg-surface-container-lowest !border-outline-variant/10",
            "focus-visible:ring-dashboard-primary/20 focus-visible:border-dashboard-primary",
          )}
        />
        {formState.errors.images_limit?.message ? (
          <p className="text-sm text-destructive">
            {formState.errors.images_limit.message}
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">Use 0 for unlimited.</p>
      </div>

      <div className="flex justify-end gap-3 border-t pt-5">
        {props.onCancel ? (
          <Button type="button" variant="outline" onClick={props.onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
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
  );
}


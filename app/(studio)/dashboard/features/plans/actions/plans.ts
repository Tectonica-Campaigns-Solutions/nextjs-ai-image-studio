"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import {
  createPlanSchema,
  updatePlanSchema,
  type CreatePlanInput,
  type UpdatePlanInput,
} from "@/app/(studio)/dashboard/features/plans/schemas/plans";
import { firstZodError } from "@/app/(studio)/dashboard/utils/validation-helpers";
import { isValidUUID } from "@/app/(studio)/dashboard/schemas/params";

export type PlanActionResult = { error?: string };

export async function createPlanAction(
  raw: CreatePlanInput,
): Promise<PlanActionResult> {
  const check = await requireAdmin();
  if (!check.success) redirect("/dashboard/login?error=admin_required");

  const parsed = createPlanSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const supabase = createAdminClient();
  const { error } = await supabase.from("plans").insert({
    code: parsed.data.code,
    name: parsed.data.name,
    images_limit: parsed.data.images_limit,
  });

  if (error) return { error: error.message || "Failed to create plan" };
  revalidatePath("/dashboard/plans");
  return {};
}

export async function updatePlanAction(
  planId: string,
  raw: UpdatePlanInput,
): Promise<PlanActionResult> {
  const check = await requireAdmin();
  if (!check.success) redirect("/dashboard/login?error=admin_required");
  if (!isValidUUID(planId)) return { error: "Invalid plan ID" };

  const parsed = updatePlanSchema.safeParse(raw);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("plans")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (error) return { error: error.message || "Failed to update plan" };
  revalidatePath("/dashboard/plans");
  return {};
}

export async function deletePlanAction(
  planId: string,
): Promise<PlanActionResult> {
  const check = await requireAdmin();
  if (!check.success) redirect("/dashboard/login?error=admin_required");
  if (!isValidUUID(planId)) return { error: "Invalid plan ID" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("plans")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId);

  if (error) return { error: error.message || "Failed to delete plan" };
  revalidatePath("/dashboard/plans");
  return {};
}

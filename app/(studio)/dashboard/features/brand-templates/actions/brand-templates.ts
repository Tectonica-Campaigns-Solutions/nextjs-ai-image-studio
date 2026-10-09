"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { isValidUUID } from "@/app/(studio)/dashboard/schemas/params";
import type { ActionResult } from "@/app/(studio)/dashboard/utils/action-utils";
import {
  brandTemplateInputSchema,
  type BrandTemplateInput,
} from "@/lib/brand-templates/schemas";

const PAGE_PATH = "/dashboard/brand-templates";

async function authorize(
  id?: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const check = await requireAdmin();
  if (!check.success) return { ok: false, error: "Unauthorized" };
  if (id !== undefined && !isValidUUID(id)) return { ok: false, error: "Invalid ID" };
  return { ok: true, userId: check.user.id };
}

function parseInput(input: BrandTemplateInput) {
  const parsed = brandTemplateInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid template" } as const;
  }
  return { data: parsed.data } as const;
}

/** A template can only be shown in the Studio once it has a layout and a background. */
async function activationError(templateId: string, variantsCount: number): Promise<string | null> {
  if (variantsCount === 0) return "Add at least one background variant before activating";
  const { count, error } = await createAdminClient()
    .from("brand_template_formats")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);
  if (error) return "Failed to check template layouts";
  if (!count) return "Design at least one format layout before activating";
  return null;
}

export async function createBrandTemplateAction(
  input: BrandTemplateInput,
): Promise<ActionResult & { id?: string }> {
  const auth = await authorize();
  if (!auth.ok) return { error: auth.error };
  const parsed = parseInput(input);
  if ("error" in parsed) return { error: parsed.error };

  // New templates have no layouts yet, so they always start inactive.
  const { data, error } = await createAdminClient()
    .from("brand_templates")
    .insert({
      ...parsed.data,
      is_active: false,
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Failed to create template" };
  revalidatePath(PAGE_PATH);
  return { id: data.id };
}

export async function updateBrandTemplateAction(
  id: string,
  input: BrandTemplateInput,
): Promise<ActionResult> {
  const auth = await authorize(id);
  if (!auth.ok) return { error: auth.error };
  const parsed = parseInput(input);
  if ("error" in parsed) return { error: parsed.error };

  if (parsed.data.is_active) {
    const err = await activationError(id, parsed.data.variants.length);
    if (err) return { error: err };
  }

  const { error } = await createAdminClient()
    .from("brand_templates")
    .update({ ...parsed.data, updated_by: auth.userId })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { error: "Failed to update template" };
  revalidatePath(PAGE_PATH);
  return {};
}

export async function setBrandTemplateActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const auth = await authorize(id);
  if (!auth.ok) return { error: auth.error };
  const supabase = createAdminClient();

  if (active) {
    const { data: template } = await supabase
      .from("brand_templates")
      .select("variants")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!template) return { error: "Template not found" };
    const variants = Array.isArray(template.variants) ? template.variants : [];
    const err = await activationError(id, variants.length);
    if (err) return { error: err };
  }

  const { error } = await supabase
    .from("brand_templates")
    .update({ is_active: active, updated_by: auth.userId })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { error: "Failed to update template" };
  revalidatePath(PAGE_PATH);
  return {};
}

export async function deleteBrandTemplateAction(id: string): Promise<ActionResult> {
  const auth = await authorize(id);
  if (!auth.ok) return { error: auth.error };

  const { error } = await createAdminClient()
    .from("brand_templates")
    .update({ deleted_at: new Date().toISOString(), is_active: false, updated_by: auth.userId })
    .eq("id", id);

  if (error) return { error: "Failed to delete template" };
  revalidatePath(PAGE_PATH);
  return {};
}

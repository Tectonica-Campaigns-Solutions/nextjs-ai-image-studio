"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { isValidUUID } from "@/app/(studio)/dashboard/schemas/params";
import type { FontWeight } from "@/app/(studio)/dashboard/types";

export type FontActionResult = { error?: string };

export async function deleteFontAction(
  clientId: string,
  fontId: string,
): Promise<FontActionResult> {
  const check = await requireAdmin();
  if (!check.success) return { error: "Unauthorized" };
  if (!isValidUUID(clientId) || !isValidUUID(fontId))
    return { error: "Invalid ID" };

  const supabase = await createClient();
  const { data: font, error: fetchError } = await supabase
    .from("client_fonts")
    .select("id")
    .eq("id", fontId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !font) return { error: "Font not found" };

  const { error } = await supabase
    .from("client_fonts")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: check.user.id,
    })
    .eq("id", fontId);

  if (error) return { error: "Failed to delete font" };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

export async function setPrimaryFontAction(
  clientId: string,
  fontId: string,
): Promise<FontActionResult> {
  const check = await requireAdmin();
  if (!check.success) return { error: "Unauthorized" };
  if (!isValidUUID(clientId) || !isValidUUID(fontId))
    return { error: "Invalid ID" };

  const supabase = await createClient();
  const { data: font, error: fetchError } = await supabase
    .from("client_fonts")
    .select("id")
    .eq("id", fontId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !font) return { error: "Font not found" };

  // Two-step primary swap: clear others first, then set target.
  // Note: without a DB transaction these two steps are not fully atomic.
  // Use .neq to avoid clearing the target in the same call.
  const { error: clearError } = await supabase
    .from("client_fonts")
    .update({ is_primary: false })
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .neq("id", fontId);

  if (clearError) return { error: "Failed to set primary font" };

  const { error } = await supabase
    .from("client_fonts")
    .update({ is_primary: true, updated_by: check.user.id })
    .eq("id", fontId)
    .eq("client_id", clientId);

  if (error) return { error: "Failed to set primary font" };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

const VALID_WEIGHTS: FontWeight[] = [
  "100", "200", "300", "400", "500", "600", "700", "800", "900",
];

export async function updateFontAction(
  clientId: string,
  fontId: string,
  raw: {
    font_family?: string;
    font_category?: string | null;
    font_weights?: FontWeight[];
  },
): Promise<FontActionResult> {
  const check = await requireAdmin();
  if (!check.success) return { error: "Unauthorized" };
  if (!isValidUUID(clientId) || !isValidUUID(fontId))
    return { error: "Invalid ID" };

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    updated_by: check.user.id,
  };

  if (raw.font_family !== undefined) {
    if (typeof raw.font_family !== "string" || raw.font_family.trim() === "") {
      return { error: "font_family must be a non-empty string" };
    }
    updateData.font_family = raw.font_family.trim();
  }

  if (raw.font_category !== undefined) {
    updateData.font_category = raw.font_category?.trim() || null;
  }

  if (raw.font_weights !== undefined) {
    if (!Array.isArray(raw.font_weights))
      return { error: "font_weights must be an array" };
    const cleaned = raw.font_weights.map((w) => String(w));
    if (!cleaned.every((w): w is FontWeight => (VALID_WEIGHTS as string[]).includes(w))) {
      return {
        error: `font_weights must be one of: ${VALID_WEIGHTS.join(", ")}`,
      };
    }
    updateData.font_weights = cleaned as FontWeight[];
  }

  const { error } = await supabase
    .from("client_fonts")
    .update(updateData)
    .eq("id", fontId)
    .eq("client_id", clientId)
    .is("deleted_at", null);

  if (error) return { error: "Failed to update font" };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

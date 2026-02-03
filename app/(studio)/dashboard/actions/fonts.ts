"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { isValidUUID } from "@/app/(studio)/dashboard/schemas/params";

export type FontActionResult = { error?: string };

export async function deleteFontAction(
  clientId: string,
  fontId: string
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
  fontId: string
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

  await supabase
    .from("client_fonts")
    .update({ is_primary: false })
    .eq("client_id", clientId)
    .is("deleted_at", null);

  const { error } = await supabase
    .from("client_fonts")
    .update({ is_primary: true, updated_by: check.user.id })
    .eq("id", fontId);

  if (error) return { error: "Failed to set primary font" };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

"use server";

import { revalidatePath } from "next/cache";
import {
  authorizeAndValidate,
  softDeletePayload,
  fetchActiveItem,
  setPrimaryItem,
  type ActionResult,
} from "@/app/(studio)/dashboard/utils/action-utils";
import type { FontWeight } from "@/app/(studio)/dashboard/utils/types";

export type FontActionResult = ActionResult;

export async function deleteFontAction(
  clientId: string,
  fontId: string,
): Promise<FontActionResult> {
  const auth = await authorizeAndValidate(clientId, fontId);
  if (!auth.ok) return { error: auth.error };

  const { error: itemError } = await fetchActiveItem(
    auth.supabase,
    "client_fonts",
    fontId,
    clientId,
  );
  if (itemError) return { error: "Font not found" };

  const { error } = await auth.supabase
    .from("client_fonts")
    .update(softDeletePayload(auth.userId))
    .eq("id", fontId);

  if (error) return { error: "Failed to delete font" };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

export async function setPrimaryFontAction(
  clientId: string,
  fontId: string,
): Promise<FontActionResult> {
  const auth = await authorizeAndValidate(clientId, fontId);
  if (!auth.ok) return { error: auth.error };

  const result = await setPrimaryItem(
    auth.supabase,
    "client_fonts",
    fontId,
    clientId,
    auth.userId,
  );
  if (result.error) return { error: "Failed to set primary font" };

  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

const VALID_WEIGHTS: FontWeight[] = [
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
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
  const auth = await authorizeAndValidate(clientId, fontId);
  if (!auth.ok) return { error: auth.error };

  const updateData: Record<string, unknown> = {
    updated_by: auth.userId,
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
    if (
      !cleaned.every((w): w is FontWeight =>
        (VALID_WEIGHTS as string[]).includes(w),
      )
    ) {
      return {
        error: `font_weights must be one of: ${VALID_WEIGHTS.join(", ")}`,
      };
    }
    updateData.font_weights = cleaned as FontWeight[];
  }

  const { error } = await auth.supabase
    .from("client_fonts")
    .update(updateData)
    .eq("id", fontId)
    .eq("client_id", clientId)
    .is("deleted_at", null);

  if (error) return { error: "Failed to update font" };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

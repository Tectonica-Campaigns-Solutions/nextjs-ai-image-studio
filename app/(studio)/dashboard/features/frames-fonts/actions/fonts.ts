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

  // Invariant: is_primary => is_brand. Force brand=true on the new primary.
  const { error: brandError } = await auth.supabase
    .from("client_fonts")
    .update({ is_brand: true, updated_by: auth.userId })
    .eq("id", fontId)
    .eq("client_id", clientId);
  if (brandError) return { error: "Failed to set primary font" };

  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

/**
 * Marks/unmarks a font as part of the client's brand identity.
 *
 * Invariant: a primary font must always be a brand font. When unmarking the
 * brand flag on a primary font, this also clears `is_primary` so the brand
 * set never contains a "phantom primary".
 */
export async function setBrandFontAction(
  clientId: string,
  fontId: string,
  isBrand: boolean,
): Promise<FontActionResult> {
  const auth = await authorizeAndValidate(clientId, fontId);
  if (!auth.ok) return { error: auth.error };

  const { data: existing, error: fetchError } = await fetchActiveItem(
    auth.supabase,
    "client_fonts",
    fontId,
    clientId,
    "id, is_primary",
  );
  if (fetchError || !existing) return { error: "Font not found" };

  const updatePayload: Record<string, unknown> = {
    is_brand: isBrand,
    updated_by: auth.userId,
  };
  if (!isBrand && (existing as { is_primary?: boolean }).is_primary) {
    updatePayload.is_primary = false;
  }

  const { error } = await auth.supabase
    .from("client_fonts")
    .update(updatePayload)
    .eq("id", fontId)
    .eq("client_id", clientId)
    .is("deleted_at", null);

  if (error) return { error: "Failed to update brand flag" };
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
    is_brand?: boolean;
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

  if (raw.is_brand !== undefined) {
    if (typeof raw.is_brand !== "boolean") {
      return { error: "is_brand must be a boolean" };
    }
    updateData.is_brand = raw.is_brand;

    // Invariant: is_primary => is_brand. If brand=false, also clear primary.
    if (!raw.is_brand) {
      const { data: existing } = await fetchActiveItem(
        auth.supabase,
        "client_fonts",
        fontId,
        clientId,
        "id, is_primary",
      );
      if ((existing as { is_primary?: boolean } | null)?.is_primary) {
        updateData.is_primary = false;
      }
    }
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

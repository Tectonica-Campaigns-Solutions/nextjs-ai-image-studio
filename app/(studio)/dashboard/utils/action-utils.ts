import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { isValidUUID } from "@/app/(studio)/dashboard/schemas/params";

/** Standard return type for server actions. */
export type ActionResult = { error?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

/**
 * Runs the admin auth check and UUID validation for a server action.
 * Returns the authenticated user and supabase client, or an early error.
 */
export async function authorizeAndValidate(
  ...ids: string[]
): Promise<
  | { ok: true; userId: string; supabase: AnySupabaseClient }
  | { ok: false; error: string }
> {
  const check = await requireAdmin();
  if (!check.success) return { ok: false, error: "Unauthorized" };

  for (const id of ids) {
    if (!isValidUUID(id)) return { ok: false, error: "Invalid ID" };
  }

  const supabase = await createClient();
  return { ok: true, userId: check.user.id, supabase };
}

/**
 * Builds the payload used to soft-delete a row.
 */
export function softDeletePayload(userId: string) {
  return {
    deleted_at: new Date().toISOString(),
    updated_by: userId,
  } as const;
}

/**
 * Fetches a single non-deleted row by id + client_id, or returns an error string.
 */
export async function fetchActiveItem(
  supabase: AnySupabaseClient,
  table: string,
  id: string,
  clientId: string,
  select = "id",
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("id", id)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return { data: null, error: "Item not found" };
  return { data: data as Record<string, unknown>, error: null };
}

/**
 * Generic "set primary" operation: clears is_primary on all siblings,
 * then sets it on the target row.
 *
 * `extraFilter` allows narrowing which siblings get cleared
 * (e.g. same asset_type for client_assets).
 */
export async function setPrimaryItem(
  supabase: AnySupabaseClient,
  table: string,
  itemId: string,
  clientId: string,
  userId: string,
  extraFilter?: { column: string; value: string },
): Promise<ActionResult> {
  const { error: itemError } = await fetchActiveItem(
    supabase,
    table,
    itemId,
    clientId,
  );
  if (itemError) return { error: itemError };

  let clearQuery = supabase
    .from(table)
    .update({ is_primary: false })
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .neq("id", itemId);

  if (extraFilter) {
    clearQuery = clearQuery.eq(extraFilter.column, extraFilter.value);
  }

  const { error: clearError } = await clearQuery;
  if (clearError) return { error: "Failed to set primary" };

  const { error } = await supabase
    .from(table)
    .update({ is_primary: true, updated_by: userId })
    .eq("id", itemId)
    .eq("client_id", clientId);

  if (error) return { error: "Failed to set primary" };
  return {};
}

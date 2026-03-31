"use server";

import { revalidatePath } from "next/cache";
import {
  authorizeAndValidate,
  softDeletePayload,
  fetchActiveItem,
  setPrimaryItem,
  type ActionResult,
} from "@/app/(studio)/dashboard/utils/action-utils";

export type AssetActionResult = ActionResult;

export async function deleteAssetAction(
  clientId: string,
  assetId: string
): Promise<AssetActionResult> {
  const auth = await authorizeAndValidate(clientId, assetId);
  if (!auth.ok) return { error: auth.error };

  const { error: itemError } = await fetchActiveItem(
    auth.supabase,
    "client_assets",
    assetId,
    clientId,
  );
  if (itemError) return { error: "Asset not found" };

  const { error } = await auth.supabase
    .from("client_assets")
    .update(softDeletePayload(auth.userId))
    .eq("id", assetId);

  if (error) return { error: "Failed to delete asset" };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

export async function setPrimaryAssetAction(
  clientId: string,
  assetId: string
): Promise<AssetActionResult> {
  const auth = await authorizeAndValidate(clientId, assetId);
  if (!auth.ok) return { error: auth.error };

  // Need asset_type to scope the clear to the same type
  const { data: asset, error: fetchError } = await auth.supabase
    .from("client_assets")
    .select("id, asset_type")
    .eq("id", assetId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !asset) return { error: "Asset not found" };

  const result = await setPrimaryItem(
    auth.supabase,
    "client_assets",
    assetId,
    clientId,
    auth.userId,
    { column: "asset_type", value: asset.asset_type },
  );
  if (result.error) return { error: "Failed to set primary asset" };

  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

export async function reorderAssetsAction(
  clientId: string,
  orderedIds: string[]
): Promise<AssetActionResult> {
  const auth = await authorizeAndValidate(clientId);
  if (!auth.ok) return { error: auth.error };

  const updates = orderedIds.map((id, index) =>
    auth.supabase
      .from("client_assets")
      .update({ sort_order: index, updated_by: auth.userId })
      .eq("id", id)
      .eq("client_id", clientId)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed) return { error: "Failed to reorder assets" };

  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

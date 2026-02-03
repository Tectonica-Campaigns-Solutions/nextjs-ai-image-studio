"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { isValidUUID } from "@/app/(studio)/dashboard/schemas/params";

export type AssetActionResult = { error?: string };

export async function deleteAssetAction(
  clientId: string,
  assetId: string
): Promise<AssetActionResult> {
  const check = await requireAdmin();
  if (!check.success) return { error: "Unauthorized" };
  if (!isValidUUID(clientId) || !isValidUUID(assetId))
    return { error: "Invalid ID" };

  const supabase = await createClient();
  const { data: asset, error: fetchError } = await supabase
    .from("client_assets")
    .select("id")
    .eq("id", assetId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !asset) return { error: "Asset not found" };

  const { error } = await supabase
    .from("client_assets")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: check.user.id,
    })
    .eq("id", assetId);

  if (error) return { error: "Failed to delete asset" };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

export async function setPrimaryAssetAction(
  clientId: string,
  assetId: string
): Promise<AssetActionResult> {
  const check = await requireAdmin();
  if (!check.success) return { error: "Unauthorized" };
  if (!isValidUUID(clientId) || !isValidUUID(assetId))
    return { error: "Invalid ID" };

  const supabase = await createClient();
  const { data: asset, error: fetchError } = await supabase
    .from("client_assets")
    .select("id, asset_type")
    .eq("id", assetId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !asset) return { error: "Asset not found" };

  await supabase
    .from("client_assets")
    .update({ is_primary: false })
    .eq("client_id", clientId)
    .eq("asset_type", asset.asset_type)
    .is("deleted_at", null);

  const { error } = await supabase
    .from("client_assets")
    .update({ is_primary: true, updated_by: check.user.id })
    .eq("id", assetId);

  if (error) return { error: "Failed to set primary asset" };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

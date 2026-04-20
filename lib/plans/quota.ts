import { createAdminClient } from "@/lib/supabase/server";

export type ClientQuotaStatus =
  | {
      ok: true;
      imagesLimit: number;
      imagesUsed: number;
      planName: string;
    }
  | {
      ok: false;
      imagesLimit: number;
      imagesUsed: number;
      planName: string;
      reason: "quota_exceeded" | "client_not_found" | "client_inactive";
    };

/**
 * Lifetime quota check based on:
 * - clients.ca_user_id (ChangeAgent user id)
 * - clients.plan_id → plans.images_limit (0 means unlimited)
 * - generated_images.client_id == ca_user_id (usage)
 */
export async function getClientQuotaStatusByCaUserId(
  caUserIdRaw: string | undefined | null,
): Promise<ClientQuotaStatus | null> {
  const caUserId = (caUserIdRaw ?? "").trim();
  if (!caUserId) return null;

  const supabase = createAdminClient();

  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, ca_user_id, is_active, deleted_at, plan_id")
    .eq("ca_user_id", caUserId)
    .is("deleted_at", null)
    .maybeSingle();

  if (clientErr || !client) {
    return {
      ok: false,
      imagesLimit: 0,
      imagesUsed: 0,
      planName: "Unknown",
      reason: "client_not_found",
    };
  }

  if (!client.is_active) {
    return {
      ok: false,
      imagesLimit: 0,
      imagesUsed: 0,
      planName: "Unknown",
      reason: "client_inactive",
    };
  }

  const planId = (client as any).plan_id as string | null;

  // Default: unlimited (matches migration backfill to Full).
  let imagesLimit = 0;
  let planName = "Full";

  if (planId) {
    const { data: plan } = await supabase
      .from("plans")
      .select("name, images_limit")
      .eq("id", planId)
      .is("deleted_at", null)
      .maybeSingle();

    if (plan) {
      imagesLimit = (plan as any).images_limit ?? 0;
      planName = (plan as any).name ?? planName;
    }
  }

  // Unlimited
  if (!imagesLimit || imagesLimit === 0) {
    return { ok: true, imagesLimit: 0, imagesUsed: 0, planName };
  }

  const { count } = await supabase
    .from("generated_images")
    .select("id", { count: "exact", head: true })
    .eq("client_id", caUserId);

  const imagesUsed = count ?? 0;

  if (imagesUsed >= imagesLimit) {
    return {
      ok: false,
      imagesLimit,
      imagesUsed,
      planName,
      reason: "quota_exceeded",
    };
  }

  return { ok: true, imagesLimit, imagesUsed, planName };
}

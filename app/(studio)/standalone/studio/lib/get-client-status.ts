import { createClient } from "@/lib/supabase/server";

export type ClientStatus = {
  exists: boolean;
  isActive: boolean;
};

export async function getClientStatusByUserId(
  caUserId: string | undefined,
): Promise<ClientStatus> {
  const trimmed = caUserId?.trim() ?? "";

  if (!trimmed) {
    return { exists: false, isActive: false };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("clients")
      .select("id, is_active, deleted_at")
      .eq("ca_user_id", trimmed)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[getClientStatusByUserId] error fetching client:", error);
      return { exists: false, isActive: false };
    }

    if (!data) {
      return { exists: false, isActive: false };
    }

    const isActive = !!data.is_active && data.deleted_at === null;

    return { exists: true, isActive };
  } catch (err) {
    console.error("[getClientStatusByUserId] unexpected error:", err);
    return { exists: false, isActive: false };
  }
}


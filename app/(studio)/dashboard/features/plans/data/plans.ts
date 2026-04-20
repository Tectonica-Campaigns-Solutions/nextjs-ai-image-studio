import { createAdminClient } from "@/lib/supabase/server";
import type { Plan } from "@/app/(studio)/dashboard/utils/types";

export async function getPlansListData(): Promise<Plan[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("plans")
    .select("id, code, name, images_limit")
    .is("deleted_at", null)
    .order("images_limit", { ascending: true });

  if (error) return [];
  return (data ?? []) as Plan[];
}

import { createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import {
  listBrandTemplatesForAdmin,
  type BrandTemplateListItem,
} from "@/lib/brand-templates/server";

export interface BrandTemplatesPageData {
  templates: BrandTemplateListItem[];
  clients: Array<{ id: string; name: string }>;
}

/** Returns null when the current user is not an admin. */
export async function getBrandTemplatesPageData(): Promise<BrandTemplatesPageData | null> {
  if (!(await isAdmin())) return null;

  const supabase = createAdminClient();
  const [templates, clientsRes] = await Promise.all([
    listBrandTemplatesForAdmin(),
    supabase.from("clients").select("id, name").is("deleted_at", null).order("name"),
  ]);

  return { templates, clients: clientsRes.data ?? [] };
}

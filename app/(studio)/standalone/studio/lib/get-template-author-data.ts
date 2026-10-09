import { createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { getBrandTemplateWithFormats } from "@/lib/brand-templates/server";
import {
  BRAND_DEFAULT_BACKGROUND,
  getBrandFormat,
  isBrandFormatKey,
} from "@/lib/brand-templates/formats";
import type { TemplateAuthorData } from "../types/image-editor-types";

export type TemplateAuthorLoadResult =
  | { status: "ok"; data: TemplateAuthorData; caUserId: string | null }
  | { status: "forbidden" }
  | { status: "not-found" };

/**
 * Template-author mode is opened from the dashboard in a new tab, so it relies
 * on the admin's dashboard session (same origin cookies) instead of the iframe gate.
 */
export async function getTemplateAuthorData(
  templateId: string | undefined,
  formatKey: string | undefined,
): Promise<TemplateAuthorLoadResult> {
  if (!(await isAdmin())) return { status: "forbidden" };
  if (!templateId || !isBrandFormatKey(formatKey)) return { status: "not-found" };

  const template = await getBrandTemplateWithFormats(templateId).catch(() => null);
  if (!template) return { status: "not-found" };

  let caUserId: string | null = null;
  if (template.client_id) {
    const { data } = await createAdminClient()
      .from("clients")
      .select("ca_user_id")
      .eq("id", template.client_id)
      .maybeSingle();
    caUserId = data?.ca_user_id ?? null;
  }

  const current = template.formats.find((f) => f.format_key === formatKey);
  return {
    status: "ok",
    caUserId,
    data: {
      template: { id: template.id, name: template.name, variants: template.variants },
      format: getBrandFormat(formatKey),
      layout: current?.fabric_json ?? null,
      otherLayouts: template.formats
        .filter((f) => f.format_key !== formatKey && f.fabric_json.objects.length > 0)
        .map((f) => ({ format: getBrandFormat(f.format_key), layout: f.fabric_json })),
      backgroundColor:
        template.variants.find((v) => v.kind === "color")?.value ?? BRAND_DEFAULT_BACKGROUND,
    },
  };
}

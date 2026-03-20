import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { DashboardDashboardShell } from "@/app/(studio)/dashboard/screens/DashboardDashboardShell";
import { DashboardFramesFontsPageScreen } from "@/app/(studio)/dashboard/screens/DashboardFramesFontsPageScreen";
import type { ClientAsset, ClientFont } from "@/app/(studio)/dashboard/types";

type FramesFontsPageProps = {
  searchParams: Promise<{
    tab?: string;
  }>;
};

export default async function FramesFontsPage({
  searchParams,
}: FramesFontsPageProps) {
  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }

  const params = await searchParams;
  const tab = params.tab === "fonts" ? "fonts" : "frames";

  const supabase = await createClient();

  const framesLimit = 500;
  const fontsLimit = 500;

  const [
    framesRes,
    fontsRes,
    clientsRes,
  ] = await Promise.all([
    supabase
      .from("client_assets")
      .select(
        "id, client_id, name, display_name, file_url, asset_type, mime_type, width, height, created_at, is_primary, variant",
        { count: "exact" }
      )
      .eq("asset_type", "frame")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(framesLimit),
    supabase
      .from("client_fonts")
      .select(
        "id, client_id, font_source, font_family, font_weights, font_category, file_url, created_at",
        { count: "exact" }
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(fontsLimit),
    supabase
      .from("clients")
      .select("id, name")
      .is("deleted_at", null),
  ]);

  if (framesRes.error || !framesRes.data || fontsRes.error) {
    redirect("/dashboard/login?error=admin_required");
  }

  return (
    <DashboardDashboardShell activeNav={tab}>
      <DashboardFramesFontsPageScreen
        frames={framesRes.data as ClientAsset[]}
        fonts={fontsRes.data as ClientFont[]}
        clientNames={Object.fromEntries((clientsRes.data ?? []).map((c) => [c.id, c.name]))}
        initialTab={tab}
      />
    </DashboardDashboardShell>
  );
}


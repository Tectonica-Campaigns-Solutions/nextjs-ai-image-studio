import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { DashboardDashboardShell } from "@/app/(studio)/dashboard/screens/DashboardDashboardShell";
import { DashboardAssetsPageScreen } from "@/app/(studio)/dashboard/screens/DashboardAssetsPageScreen";
import type { ClientAsset } from "@/app/(studio)/dashboard/types";

export default async function AssetsPage() {
  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }

  const supabase = await createClient();
  const limit = 500;

  const [{ data, count, error }, clientsRes] = await Promise.all([
    supabase
      .from("client_assets")
      .select(
        "id, client_id, name, display_name, file_url, asset_type, mime_type, width, height, created_at, is_primary, variant",
        { count: "exact" }
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("clients")
      .select("id, name")
      .is("deleted_at", null),
  ]);

  if (error || !data) {
    redirect("/dashboard/login?error=admin_required");
  }

  const clientNames = Object.fromEntries(
    (clientsRes.data ?? []).map((client) => [client.id, client.name])
  );

  return (
    <DashboardDashboardShell activeNav="assets">
      <DashboardAssetsPageScreen
        assets={data as ClientAsset[]}
        totalAssets={count ?? 0}
        showingCount={data.length}
        clientNames={clientNames}
      />
    </DashboardDashboardShell>
  );
}


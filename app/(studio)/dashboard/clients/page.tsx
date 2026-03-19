import { redirect } from "next/navigation";
import {
  getClientsListData,
  type ClientStatusFilter,
  type ClientSortKey,
} from "@/app/(studio)/dashboard/data/clients";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { createClient } from "@/lib/supabase/server";
import { StitchDashboardShell } from "@/app/(studio)/dashboard/stitch/StitchDashboardShell";
import { getDashboardOverviewData } from "@/app/(studio)/dashboard/data/overview";
import { StitchClientsAdminScreen } from "@/app/(studio)/dashboard/stitch/StitchClientsAdminScreen";

const PAGE_SIZE = 25;

export default async function ClientsPage() {
  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }

  // Load a bigger dataset once and do filter/sort/pagination in the browser.
  // This avoids slow backend filtering queries on every UI interaction.
  const LOAD_LIMIT = 5000;
  const result = await getClientsListData({
    page: 1,
    pageSize: LOAD_LIMIT,
    status: "all" as ClientStatusFilter,
    sort: "created" as ClientSortKey,
    search: undefined,
  });
  if (result === null) {
    redirect("/dashboard/login?error=admin_required");
  }

  const overview = await getDashboardOverviewData();
  if (!overview) {
    redirect("/dashboard/login?error=admin_required");
  }

  const clientIds = result.clients.map((c) => c.id);
  const assetCountsByClientId: Record<string, number> = {};
  const logoByClientId: Record<string, string | null | undefined> = {};

  if (clientIds.length > 0) {
    const supabase = await createClient();
    const [logosRes, assetsRes] = await Promise.all([
      supabase
        .from("client_assets")
        .select("client_id,file_url")
        .eq("asset_type", "logo")
        .eq("is_primary", true)
        .in("client_id", clientIds)
        .is("deleted_at", null),
      supabase
        .from("client_assets")
        .select("client_id,id")
        .in("client_id", clientIds)
        .is("deleted_at", null),
    ]);

    for (const row of (logosRes.data ?? []) as Array<{
      client_id: string;
      file_url: string | null;
    }>) {
      logoByClientId[row.client_id] = row.file_url;
    }

    for (const row of (assetsRes.data ?? []) as Array<{ client_id: string }>) {
      assetCountsByClientId[row.client_id] =
        (assetCountsByClientId[row.client_id] ?? 0) + 1;
    }
  }

  return (
    <StitchDashboardShell activeNav="clients">
      <StitchClientsAdminScreen
        stats={overview.stats}
        clients={result.clients}
        totalClients={result.total}
        currentPage={1}
        pageSize={PAGE_SIZE}
        assetCountsByClientId={assetCountsByClientId}
        logoByClientId={logoByClientId}
      />
    </StitchDashboardShell>
  );
}

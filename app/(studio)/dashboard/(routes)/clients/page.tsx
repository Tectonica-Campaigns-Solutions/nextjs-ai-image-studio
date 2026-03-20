import { redirect } from "next/navigation";
import {
  getClientsListData,
  getClientsLogosAndAssetCounts,
  type ClientStatusFilter,
  type ClientSortKey,
} from "@/app/(studio)/dashboard/features/clients/data/clients";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { DashboardDashboardShell } from "@/app/(studio)/dashboard/components/DashboardDashboardShell";
import { getDashboardOverviewData } from "@/app/(studio)/dashboard/features/overview/data/overview";
import { DashboardClientsAdminScreen } from "@/app/(studio)/dashboard/features/clients/screens/DashboardClientsAdminScreen";

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
  const { assetCountsByClientId, logoByClientId } =
    await getClientsLogosAndAssetCounts(clientIds);

  return (
    <DashboardDashboardShell activeNav="clients">
      <DashboardClientsAdminScreen
        stats={overview.stats}
        clients={result.clients}
        totalClients={result.total}
        currentPage={1}
        pageSize={PAGE_SIZE}
        assetCountsByClientId={assetCountsByClientId}
        logoByClientId={logoByClientId}
      />
    </DashboardDashboardShell>
  );
}

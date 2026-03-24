import { redirect } from "next/navigation";
import {
  getClientsListData,
  getClientsLogosAndAssetCounts,
  type ClientStatusFilter,
  type ClientSortKey,
} from "@/app/(studio)/dashboard/features/clients/data/clients";
import { getDashboardOverviewData } from "@/app/(studio)/dashboard/features/overview/data/overview";
import { DashboardClientsAdminScreen } from "@/app/(studio)/dashboard/features/clients/screens/DashboardClientsAdminScreen";
import { Metadata } from "next";

const PAGE_SIZE = 25;

export const metadata: Metadata = {
  title: "Clients",
};

type ClientsPageProps = {
  searchParams: Promise<{
    page?: string;
    status?: string;
    sort?: string;
    search?: string;
  }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const status = (params.status ?? "all") as ClientStatusFilter;
  const sort = (params.sort ?? "created") as ClientSortKey;
  const search = params.search || undefined;

  const result = await getClientsListData({
    page,
    pageSize: PAGE_SIZE,
    status,
    sort,
    search,
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
    <DashboardClientsAdminScreen
      stats={overview.stats}
      clients={result.clients}
      totalClients={result.total}
      currentPage={page}
      pageSize={PAGE_SIZE}
      currentStatus={status}
      currentSort={sort}
      currentSearch={search ?? ""}
      assetCountsByClientId={assetCountsByClientId}
      logoByClientId={logoByClientId}
    />
  );
}

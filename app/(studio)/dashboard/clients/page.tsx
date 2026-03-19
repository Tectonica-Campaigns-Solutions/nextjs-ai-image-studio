import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  getClientsListData,
  type ClientStatusFilter,
  type ClientSortKey,
} from "@/app/(studio)/dashboard/data/clients";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { ClientsList } from "@/app/(studio)/dashboard/components/clients-list";

const PAGE_SIZE = 25;

type ClientsPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    sort?: string;
  }>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const search = params.q?.trim() ?? undefined;
  const status = (params.status === "active" || params.status === "inactive"
    ? params.status
    : "all") as ClientStatusFilter;
  const sort = (params.sort === "name" || params.sort === "updated"
    ? params.sort
    : "created") as ClientSortKey;

  const result = await getClientsListData({
    search,
    status,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });
  if (result === null) {
    redirect("/dashboard/login?error=admin_required");
  }

  return (
    <Suspense>
      <ClientsList
        initialClients={result.clients}
        totalClients={result.total}
        currentPage={page}
        pageSize={PAGE_SIZE}
      />
    </Suspense>
  );
}

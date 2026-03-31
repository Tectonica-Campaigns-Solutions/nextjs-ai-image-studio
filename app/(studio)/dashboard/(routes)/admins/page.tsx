import { redirect } from "next/navigation";
import { getAdminsListData } from "@/app/(studio)/dashboard/features/admins/data/admins";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import {
  AdminSortKey,
  AdminStatusFilter,
  DashboardAdminsListScreen,
} from "@/app/(studio)/dashboard/features/admins/screens/DashboardAdminsListScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admins",
};

type AdminsPageProps = {
  searchParams: Promise<{
    page?: string;
    status?: string;
    sort?: string;
    search?: string;
  }>;
};

export default async function AdminsPage({ searchParams }: AdminsPageProps) {
  const auth = await requireAdmin();

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const status = (params.status ?? "active") as AdminStatusFilter;
  const sort = (params.sort ?? "granted_at") as AdminSortKey;
  const search = params.search || "";

  const admins = await getAdminsListData();
  if (admins === null) {
    redirect("/dashboard/login?error=admin_required");
  }

  return (
    <DashboardAdminsListScreen
      admins={admins}
      currentUserId={auth.success ? auth.user.id : null}
      currentStatus={status}
      currentSort={sort}
      currentSearch={search}
      currentPage={page}
    />
  );
}

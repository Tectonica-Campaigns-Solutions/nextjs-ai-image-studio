import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { getAssetsPageData } from "@/app/(studio)/dashboard/features/assets/data/assets";
import { DashboardDashboardShell } from "@/app/(studio)/dashboard/components/DashboardDashboardShell";
import { DashboardAssetsPageScreen } from "@/app/(studio)/dashboard/features/assets/screens/DashboardAssetsPageScreen";

export default async function AssetsPage() {
  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }

  const data = await getAssetsPageData();
  if (!data) {
    redirect("/dashboard/login?error=admin_required");
  }

  return (
    <DashboardDashboardShell activeNav="assets">
      <DashboardAssetsPageScreen
        assets={data.assets}
        totalAssets={data.totalAssets}
        showingCount={data.assets.length}
        clientNames={data.clientNames}
      />
    </DashboardDashboardShell>
  );
}

import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { getDashboardOverviewData } from "@/app/(studio)/dashboard/features/overview/data/overview";
import { DashboardDashboardShell } from "@/app/(studio)/dashboard/components/DashboardDashboardShell";
import { DashboardOverviewScreen } from "@/app/(studio)/dashboard/features/overview/screens/DashboardOverviewScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Tectonica.ai",
};

export default async function DashboardPage() {
  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }

  const data = await getDashboardOverviewData();
  if (!data) {
    redirect("/dashboard/login?error=admin_required");
  }

  return (
    <DashboardDashboardShell activeNav="overview">
      <DashboardOverviewScreen data={data} />
    </DashboardDashboardShell>
  );
}

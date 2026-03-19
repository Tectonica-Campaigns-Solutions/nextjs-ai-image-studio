import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { getDashboardOverviewData } from "@/app/(studio)/dashboard/data/overview";
import { StitchDashboardShell } from "@/app/(studio)/dashboard/stitch/StitchDashboardShell";
import { StitchOverviewScreen } from "@/app/(studio)/dashboard/stitch/StitchOverviewScreen";

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
    <StitchDashboardShell activeNav="overview">
      <StitchOverviewScreen data={data} />
    </StitchDashboardShell>
  );
}

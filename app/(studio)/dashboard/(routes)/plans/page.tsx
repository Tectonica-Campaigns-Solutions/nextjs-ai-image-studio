import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { getPlansListData } from "@/app/(studio)/dashboard/features/plans/data/plans";
import { DashboardPlansScreen } from "@/app/(studio)/dashboard/features/plans/screens/DashboardPlansScreen";

export default async function PlansPage() {
  const check = await requireAdmin();
  if (!check.success) redirect("/dashboard/login?error=admin_required");

  const data = await getPlansListData();
  return <DashboardPlansScreen plans={data} />;
}


import { redirect } from "next/navigation";
import { getAdminsListData } from "@/app/(studio)/dashboard/features/admins/data/admins";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { DashboardDashboardShell } from "@/app/(studio)/dashboard/components/DashboardDashboardShell";
import { DashboardAdminsListScreen } from "@/app/(studio)/dashboard/features/admins/screens/DashboardAdminsListScreen";

export default async function AdminsPage() {
  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }
  const admins = await getAdminsListData();
  if (admins === null) {
    redirect("/dashboard/login?error=admin_required");
  }
  return (
    <DashboardDashboardShell activeNav="admins">
      <DashboardAdminsListScreen admins={admins} currentUserId={auth.user.id} />
    </DashboardDashboardShell>
  );
}

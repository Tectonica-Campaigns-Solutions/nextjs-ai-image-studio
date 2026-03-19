import { redirect } from "next/navigation";
import { getAdminsListData } from "@/app/(studio)/dashboard/data/admins";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { StitchDashboardShell } from "@/app/(studio)/dashboard/stitch/StitchDashboardShell";
import { StitchAdminsListScreen } from "@/app/(studio)/dashboard/stitch/StitchAdminsListScreen";

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
    <StitchDashboardShell activeNav="admins">
      <StitchAdminsListScreen admins={admins} currentUserId={auth.user.id} />
    </StitchDashboardShell>
  );
}

import { redirect } from "next/navigation";
import { getAdminsListData } from "@/app/(studio)/dashboard/features/admins/data/admins";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { DashboardAdminsListScreen } from "@/app/(studio)/dashboard/features/admins/screens/DashboardAdminsListScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admins",
};

export default async function AdminsPage() {
  const auth = await requireAdmin();

  const admins = await getAdminsListData();
  if (admins === null) {
    redirect("/dashboard/login?error=admin_required");
  }

  return <DashboardAdminsListScreen admins={admins} currentUserId={auth.success ? auth.user.id : null} />;
}

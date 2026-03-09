import { redirect } from "next/navigation";
import { getAdminsListData } from "@/app/(studio)/dashboard/data/admins";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { AdminsList } from "@/app/(studio)/dashboard/components/admins-list";

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
    <AdminsList initialAdmins={admins} currentUserId={auth.user.id} />
  );
}

import { redirect } from "next/navigation";
import { getAdmins, getCurrentUserId } from "@/app/(studio)/admin/data/admins";
import { AdminsList } from "@/app/(studio)/admin/components/admins-list";

export default async function AdminsPage() {
  const [admins, currentUserId] = await Promise.all([
    getAdmins(),
    getCurrentUserId(),
  ]);
  if (admins === null) {
    redirect("/admin/login?error=admin_required");
  }
  return (
    <AdminsList initialAdmins={admins} currentUserId={currentUserId} />
  );
}

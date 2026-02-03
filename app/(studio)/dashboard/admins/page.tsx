import { redirect } from "next/navigation";
import { getAdmins, getCurrentUserId } from "@/app/(studio)/dashboard/data/admins";
import { AdminsList } from "@/app/(studio)/dashboard/components/admins-list";

export default async function AdminsPage() {
  const [admins, currentUserId] = await Promise.all([
    getAdmins(),
    getCurrentUserId(),
  ]);
  if (admins === null) {
    redirect("/dashboard/login?error=admin_required");
  }
  return (
    <AdminsList initialAdmins={admins} currentUserId={currentUserId} />
  );
}

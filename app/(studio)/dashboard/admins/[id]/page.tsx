import { notFound, redirect } from "next/navigation";
import { getAdminDetailData } from "@/app/(studio)/dashboard/data/admins";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { DashboardDashboardShell } from "@/app/(studio)/dashboard/screens/DashboardDashboardShell";
import { DashboardAdminDetailScreen } from "@/app/(studio)/dashboard/screens/DashboardAdminDetailScreen";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminDetailPage({ params }: PageProps) {
  const { id } = await params;

  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }
  const admin = await getAdminDetailData(id);
  if (admin === null) {
    notFound();
  }

  return (
    <DashboardDashboardShell activeNav="admins">
      <DashboardAdminDetailScreen admin={admin} currentUserId={auth.user.id} />
    </DashboardDashboardShell>
  );
}

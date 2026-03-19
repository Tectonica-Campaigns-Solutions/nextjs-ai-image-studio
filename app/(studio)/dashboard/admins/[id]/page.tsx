import { notFound, redirect } from "next/navigation";
import { getAdminDetailData } from "@/app/(studio)/dashboard/data/admins";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { StitchDashboardShell } from "@/app/(studio)/dashboard/stitch/StitchDashboardShell";
import { StitchAdminDetailScreen } from "@/app/(studio)/dashboard/stitch/StitchAdminDetailScreen";

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
    <StitchDashboardShell activeNav="admins">
      <StitchAdminDetailScreen admin={admin} currentUserId={auth.user.id} />
    </StitchDashboardShell>
  );
}

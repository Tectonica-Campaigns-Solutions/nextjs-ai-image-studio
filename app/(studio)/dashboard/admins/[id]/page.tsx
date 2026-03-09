import { notFound, redirect } from "next/navigation";
import { getAdminDetailData } from "@/app/(studio)/dashboard/data/admins";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { AdminDetailClient } from "@/app/(studio)/dashboard/components/admin-detail-client";

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
    <AdminDetailClient admin={admin} currentUserId={auth.user.id} />
  );
}

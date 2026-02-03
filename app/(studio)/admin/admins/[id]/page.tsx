import { redirect } from "next/navigation";
import { getAdminById, getCurrentUserId } from "@/app/(studio)/admin/data/admins";
import { AdminDetailClient } from "@/app/(studio)/admin/components/admin-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [admin, currentUserId] = await Promise.all([
    getAdminById(id),
    getCurrentUserId(),
  ]);

  if (admin === null) {
    redirect("/admin/admins");
  }

  return (
    <AdminDetailClient admin={admin} currentUserId={currentUserId} />
  );
}

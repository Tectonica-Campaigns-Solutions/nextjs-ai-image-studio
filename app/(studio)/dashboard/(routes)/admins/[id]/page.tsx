import { notFound, redirect } from "next/navigation";
import { getAdminDetailData } from "@/app/(studio)/dashboard/features/admins/data/admins";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { DashboardAdminDetailScreen } from "@/app/(studio)/dashboard/features/admins/screens/DashboardAdminDetailScreen";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Admin Detail",
};

export default async function AdminDetailPage({ params }: PageProps) {
  const { id } = await params;
  const auth = await requireAdmin();

  const admin = await getAdminDetailData(id);
  if (admin === null) {
    notFound();
  }

  return <DashboardAdminDetailScreen admin={admin} currentUserId={auth.success ? auth.user.id : null} />;
}

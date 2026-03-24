import { notFound, redirect } from "next/navigation";
import { getClientDetailPageData } from "@/app/(studio)/dashboard/features/clients/data/clients";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { DashboardDashboardShell } from "@/app/(studio)/dashboard/components/DashboardDashboardShell";
import { DashboardClientDetailScreen } from "@/app/(studio)/dashboard/features/clients/screens/DashboardClientDetailScreen";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Client Detail | Tectonica.ai",
};

export default async function ClientDetailPage({ params }: PageProps) {
  const { id: _id } = await params;

  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }

  const data = await getClientDetailPageData(_id);
  if (!data.client) {
    notFound();
  }

  return (
    <DashboardDashboardShell activeNav="clients">
      <DashboardClientDetailScreen data={data} />
    </DashboardDashboardShell>
  );
}

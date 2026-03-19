import { notFound, redirect } from "next/navigation";
import { getClientDetailPageData } from "@/app/(studio)/dashboard/data/clients";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { StitchDashboardShell } from "@/app/(studio)/dashboard/stitch/StitchDashboardShell";
import { StitchClientDetailScreen } from "@/app/(studio)/dashboard/stitch/StitchClientDetailScreen";

interface PageProps {
  params: Promise<{ id: string }>;
}

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
    <StitchDashboardShell activeNav="clients">
      <StitchClientDetailScreen data={data} />
    </StitchDashboardShell>
  );
}

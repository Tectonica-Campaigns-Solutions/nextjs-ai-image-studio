import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { ClientDetailHeaderSection } from "@/app/(studio)/dashboard/components/client-detail-header-section";
import ClientDetailLoading from "./loading";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;

  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }

  return (
    <Suspense fallback={<ClientDetailLoading />}>
      <ClientDetailHeaderSection clientId={id} />
    </Suspense>
  );
}

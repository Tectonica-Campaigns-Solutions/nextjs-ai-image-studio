import { notFound, redirect } from "next/navigation";
import { getClientDetailPageData } from "@/app/(studio)/dashboard/features/clients/data/clients";
import { DashboardClientDetailScreen } from "@/app/(studio)/dashboard/features/clients/screens/DashboardClientDetailScreen";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Client Detail",
};

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;

  const data = await getClientDetailPageData(id);
  if (!data.client) {
    notFound();
  }

  return <DashboardClientDetailScreen data={data} />;
}

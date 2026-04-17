import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getGeneratedImagesPageData } from "@/app/(studio)/dashboard/features/generated-images/data/generated-images";
import { DashboardGeneratedImagesScreen } from "@/app/(studio)/dashboard/features/generated-images/screens/DashboardGeneratedImagesScreen";

export const metadata: Metadata = {
  title: "Generated Images",
};

type GeneratedImagesPageProps = Readonly<{
  searchParams: Promise<{
    page?: string;
    client?: string;
  }>;
}>;

export default async function GeneratedImagesPage({ searchParams }: GeneratedImagesPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const client = params.client?.trim() || undefined;

  const pageSize = 20;
  const data = await getGeneratedImagesPageData({ page, pageSize, clientCaUserId: client });
  if (!data) {
    redirect("/dashboard/login?error=admin_required");
  }

  return (
    <DashboardGeneratedImagesScreen
      items={data.images}
      clients={data.clients}
      page={data.page}
      pageSize={data.pageSize}
      total={data.total}
      client={client}
    />
  );
}


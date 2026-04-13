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
    search?: string;
  }>;
}>;

export default async function GeneratedImagesPage({ searchParams }: GeneratedImagesPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const search = params.search?.trim() || undefined;

  const pageSize = 20;
  const data = await getGeneratedImagesPageData({ page, pageSize, search });
  if (!data) {
    redirect("/dashboard/login?error=admin_required");
  }

  return (
    <DashboardGeneratedImagesScreen
      items={data.images}
      page={data.page}
      pageSize={data.pageSize}
      total={data.total}
      search={search}
    />
  );
}


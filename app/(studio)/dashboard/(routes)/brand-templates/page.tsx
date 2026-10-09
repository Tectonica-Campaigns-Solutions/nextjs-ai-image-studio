import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getBrandTemplatesPageData } from "@/app/(studio)/dashboard/features/brand-templates/data/brand-templates";
import { DashboardBrandTemplatesPageScreen } from "@/app/(studio)/dashboard/features/brand-templates/screens/DashboardBrandTemplatesPageScreen";

export const metadata: Metadata = {
  title: "Brand Templates",
};

export default async function BrandTemplatesPage() {
  const data = await getBrandTemplatesPageData();
  if (!data) {
    redirect("/dashboard/login?error=admin_required");
  }

  return <DashboardBrandTemplatesPageScreen templates={data.templates} clients={data.clients} />;
}

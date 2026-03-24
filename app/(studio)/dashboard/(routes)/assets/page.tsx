import { redirect } from "next/navigation";
import { getAssetsPageData } from "@/app/(studio)/dashboard/features/assets/data/assets";
import { DashboardAssetsPageScreen } from "@/app/(studio)/dashboard/features/assets/screens/DashboardAssetsPageScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Assets",
};

export default async function AssetsPage() {
  const data = await getAssetsPageData();
  if (!data) {
    redirect("/dashboard/login?error=admin_required");
  }

  return (
    <DashboardAssetsPageScreen
      assets={data.assets}
      totalAssets={data.totalAssets}
      showingCount={data.assets.length}
      clientNames={data.clientNames}
    />
  );
}

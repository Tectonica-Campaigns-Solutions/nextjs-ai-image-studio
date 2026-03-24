import { redirect } from "next/navigation";
import { getDashboardOverviewData } from "@/app/(studio)/dashboard/features/overview/data/overview";
import { DashboardOverviewScreen } from "@/app/(studio)/dashboard/features/overview/screens/DashboardOverviewScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const data = await getDashboardOverviewData();
  if (!data) {
    redirect("/dashboard/login?error=admin_required");
  }

  return <DashboardOverviewScreen data={data} />;
}

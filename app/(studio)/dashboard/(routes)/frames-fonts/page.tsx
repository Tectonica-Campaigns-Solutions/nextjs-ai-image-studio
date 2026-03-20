import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { getFramesFontsPageData } from "@/app/(studio)/dashboard/features/frames-fonts/data/frames-fonts";
import { DashboardDashboardShell } from "@/app/(studio)/dashboard/components/DashboardDashboardShell";
import { DashboardFramesFontsPageScreen } from "@/app/(studio)/dashboard/features/frames-fonts/screens/DashboardFramesFontsPageScreen";

type FramesFontsPageProps = {
  searchParams: Promise<{
    tab?: string;
  }>;
};

export default async function FramesFontsPage({
  searchParams,
}: FramesFontsPageProps) {
  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }

  const params = await searchParams;
  const tab = params.tab === "fonts" ? "fonts" : "frames";

  const data = await getFramesFontsPageData();
  if (!data) {
    redirect("/dashboard/login?error=admin_required");
  }

  return (
    <DashboardDashboardShell activeNav={tab}>
      <DashboardFramesFontsPageScreen
        frames={data.frames}
        fonts={data.fonts}
        clientNames={data.clientNames}
        initialTab={tab}
      />
    </DashboardDashboardShell>
  );
}

import { redirect } from "next/navigation";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { getCanvasSessionsPageData } from "@/app/(studio)/dashboard/features/canvas-sessions/data/canvas-sessions";
import { DashboardDashboardShell } from "@/app/(studio)/dashboard/components/DashboardDashboardShell";
import { DashboardCanvasSessionsPageScreen } from "@/app/(studio)/dashboard/features/canvas-sessions/screens/DashboardCanvasSessionsPageScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Canvas Sessions | Tectonica.ai",
};

export default async function CanvasSessionsPage() {
  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }

  const data = await getCanvasSessionsPageData();
  if (!data) {
    redirect("/dashboard/login?error=admin_required");
  }

  return (
    <DashboardDashboardShell activeNav="canvas-sessions">
      <DashboardCanvasSessionsPageScreen
        sessions={data.sessions}
        totalSessions={data.totalSessions}
        showingCount={data.sessions.length}
        clientNames={data.clientNames}
      />
    </DashboardDashboardShell>
  );
}

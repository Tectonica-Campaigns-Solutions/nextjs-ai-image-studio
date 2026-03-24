import { redirect } from "next/navigation";
import { getCanvasSessionsPageData } from "@/app/(studio)/dashboard/features/canvas-sessions/data/canvas-sessions";
import { DashboardCanvasSessionsPageScreen } from "@/app/(studio)/dashboard/features/canvas-sessions/screens/DashboardCanvasSessionsPageScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Canvas Sessions",
};

export default async function CanvasSessionsPage() {
  const data = await getCanvasSessionsPageData();
  if (!data) {
    redirect("/dashboard/login?error=admin_required");
  }

  return (
    <DashboardCanvasSessionsPageScreen
      sessions={data.sessions}
      totalSessions={data.totalSessions}
      showingCount={data.sessions.length}
      clientNames={data.clientNames}
    />
  );
}

import { Metadata } from "next";
import { isDashboardFeatureEnabled } from "@/app/(studio)/dashboard/config/feature-flags";
import { getVisualStudioAccessLogData } from "@/app/(studio)/dashboard/features/visual-studio-access/data/visual-studio-access";
import { DashboardVisualStudioAccessLogScreen } from "@/app/(studio)/dashboard/features/visual-studio-access/screens/DashboardVisualStudioAccessLogScreen";

export const metadata: Metadata = {
  title: "Visual Studio Logs",
};

export default async function VisualStudioAccessPage() {
  if (!isDashboardFeatureEnabled("visualStudioAccessLogs")) {
    // Evitar que se acceda directamente a la ruta cuando el flag está desactivado.
    return null;
  }

  const entries = await getVisualStudioAccessLogData();
  return <DashboardVisualStudioAccessLogScreen entries={entries} />;
}


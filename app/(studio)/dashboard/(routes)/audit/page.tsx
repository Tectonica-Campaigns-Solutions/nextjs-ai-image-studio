import { getAuditLogData } from "@/app/(studio)/dashboard/features/audit/data/audit";
import { DashboardAuditScreen } from "@/app/(studio)/dashboard/features/audit/screens/DashboardAuditScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audit Log",
};

export default async function AuditPage() {
  const entries = await getAuditLogData();

  return <DashboardAuditScreen entries={entries} />;
}

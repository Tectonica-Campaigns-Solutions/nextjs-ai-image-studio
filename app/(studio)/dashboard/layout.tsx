import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "./components/admin-shell";
import { AdminShellSkeleton } from "./components/admin-shell-skeleton";

export const metadata: Metadata = {
  title: "Admin | Tectonica.ai",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

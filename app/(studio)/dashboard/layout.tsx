import type { Metadata } from "next";
import { AdminShell } from "./components/admin-shell";

export const metadata: Metadata = {
  title: "Admin | Tectonica.ai",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminShell>{children}</AdminShell>;
}

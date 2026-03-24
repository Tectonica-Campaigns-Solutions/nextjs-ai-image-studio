import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Tectonica.ai",
    default: "Dashboard | Tectonica.ai",
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}

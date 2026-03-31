import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Tectonica",
    default: "Dashboard | Tectonica",
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}

import type { Metadata } from "next";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

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
  // Dashboard screens notify through sonner's `toast`; the root layout only
  // mounts the shadcn toaster, so sonner needs its own outlet here.
  return (
    <>
      {children}
      <SonnerToaster position="bottom-right" richColors />
    </>
  );
}

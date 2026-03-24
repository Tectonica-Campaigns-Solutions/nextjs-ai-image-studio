import { redirect } from "next/navigation";
import { getFramesFontsPageData } from "@/app/(studio)/dashboard/features/frames-fonts/data/frames-fonts";
import { DashboardFramesFontsPageScreen } from "@/app/(studio)/dashboard/features/frames-fonts/screens/DashboardFramesFontsPageScreen";
import { Metadata } from "next";

type FramesFontsPageProps = {
  searchParams: Promise<{
    tab?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Frames & Fonts",
};

export default async function FramesFontsPage({
  searchParams,
}: FramesFontsPageProps) {
  const params = await searchParams;
  const tab = params.tab === "fonts" ? "fonts" : "frames";

  const data = await getFramesFontsPageData();
  if (!data) {
    redirect("/dashboard/login?error=admin_required");
  }

  return (
    <DashboardFramesFontsPageScreen
      frames={data.frames}
      fonts={data.fonts}
      clientNames={data.clientNames}
      initialTab={tab}
    />
  );
}

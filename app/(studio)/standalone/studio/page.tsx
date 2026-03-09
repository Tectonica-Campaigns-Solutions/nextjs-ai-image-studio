import { Suspense } from "react";
import { StudioLoading } from "./studio-loading";
import StudioEditorLoader from "./studio-editor-loader";

type StudioPageProps = {
  searchParams: Promise<{
    imageUrl?: string;
    user_id?: string;
    session_id?: string;
  }>;
};

export default function StudioPage({ searchParams }: StudioPageProps) {
  return (
    <Suspense fallback={<StudioLoading />}>
      <StudioEditorLoader searchParams={searchParams} />
    </Suspense>
  );
}

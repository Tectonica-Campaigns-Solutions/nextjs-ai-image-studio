import { Suspense } from "react";
import { StudioLoading } from "./studio-loading";
import StudioEditorLoader from "./studio-editor-loader";

type StudioPageProps = {
  searchParams: Promise<{
    imageUrl?: string;
    user_id?: string;
    client_id?: string;
    user_email?: string;
    session_id?: string;
    text?: string;
    text_delim?: string;
    /** Published group / recruitment page URL for one-click QR (VS-C08). */
    group_page_url?: string;
    groupPageUrl?: string;
  }>;
};

export default function StudioPage({ searchParams }: StudioPageProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={<StudioLoading />}>
        <StudioEditorLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

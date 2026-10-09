import dynamic from "next/dynamic";
import { SearchX } from "lucide-react";
import { getEditorAssets } from "./lib/get-editor-assets";
import { getCanvasSession, getCanvasSessionForImageUrl } from "./lib/get-canvas-session";
import { StudioLoading } from "./studio-loading";
import { getClientStatusByUserId } from "./lib/get-client-status";
import { getTemplateAuthorData } from "./lib/get-template-author-data";
import {
  StudioAccessDeniedScreen,
  StudioStateCard,
  StudioStateScreen,
} from "./components/StudioStateScreen";

const ImageEditorStandalone = dynamic(
  () => import("./image-editor-standalone"),
  { loading: () => <StudioLoading /> }
);

type StudioEditorLoaderProps = {
  searchParams: Promise<{
    imageUrl?: string;
    user_id?: string;
    client_id?: string;
    user_email?: string;
    session_id?: string;
    chat_id?: string;
    text?: string;
    text_delim?: string;
    group_page_url?: string;
    groupPageUrl?: string;
    mode?: string;
    template_id?: string;
    format?: string;
  }>;
};

/**
 * Async server component that fetches editor assets and session, then renders the editor.
 * Used inside Suspense so the parent can show a skeleton fallback while loading
 */
export default async function StudioEditorLoader({
  searchParams,
}: StudioEditorLoaderProps) {
  const params = await searchParams;

  if (params.mode === "template-author") {
    return <TemplateAuthorLoader params={params} />;
  }

  // const clientStatus = await getClientStatusByUserId(params.user_id);
  // if (clientStatus.exists && !clientStatus.isActive) {
  //   return <StudioAccountDeactivatedScreen />;
  // }

  const [
    { logoAssets, fontAssets, frameAssets, allowCustomLogo },
    sessionData,
  ] = await Promise.all([
    getEditorAssets(params.client_id, params.user_id),
    // An explicit session wins; otherwise an image sent from Studio to the chat
    // reopens with its editable layers.
    params.session_id
      ? getCanvasSession(params.session_id, params.user_id)
      : getCanvasSessionForImageUrl(params.imageUrl, params.user_id),
  ]);

  return (
    <ImageEditorStandalone
      params={params}
      logoAssets={logoAssets}
      frameAssets={frameAssets}
      fontAssets={fontAssets}
      sessionData={sessionData}
      allowCustomLogo={allowCustomLogo}
    />
  );
}

async function TemplateAuthorLoader({
  params,
}: {
  params: Awaited<StudioEditorLoaderProps["searchParams"]>;
}) {
  const result = await getTemplateAuthorData(params.template_id, params.format);
  if (result.status === "forbidden") return <StudioAccessDeniedScreen />;
  if (result.status === "not-found") {
    return (
      <StudioStateScreen subtitle="Template layout" showDock={false}>
        <StudioStateCard
          variant="error"
          icon={<SearchX className="size-[22px]" aria-hidden />}
          title="Template not found"
          description="It may have been deleted. Go back to Brand Templates in the dashboard."
        />
      </StudioStateScreen>
    );
  }

  // Load the template client's fonts/logos so the layout uses its brand assets.
  const { logoAssets, fontAssets, frameAssets, allowCustomLogo } = await getEditorAssets(
    result.caUserId ?? undefined,
    undefined,
  );

  return (
    <ImageEditorStandalone
      params={{ mode: params.mode, template_id: params.template_id, format: params.format }}
      logoAssets={logoAssets}
      frameAssets={frameAssets}
      fontAssets={fontAssets}
      sessionData={null}
      allowCustomLogo={allowCustomLogo}
      templateAuthor={result.data}
    />
  );
}

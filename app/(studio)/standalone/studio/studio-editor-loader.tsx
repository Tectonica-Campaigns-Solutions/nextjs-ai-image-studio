import dynamic from "next/dynamic";
import { SearchX } from "lucide-react";
import { getEditorAssets } from "./lib/get-editor-assets";
import { getCanvasSession, getCanvasSessionForImageUrl } from "./lib/get-canvas-session";
import { StudioLoading } from "./studio-loading";
import { getClientStatusByUserId } from "./lib/get-client-status";
import { getTemplateAuthorData } from "./lib/get-template-author-data";
import type { CanvasSessionData } from "./types/image-editor-types";
import { listActiveBrandTemplatesForClient } from "@/lib/brand-templates/server";
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

  if (params.mode === "templates") {
    const session = params.session_id
      ? await getCanvasSession(params.session_id, params.user_id)
      : null;
    return (
      <TemplateModeLoader
        params={params}
        session={session?.kind === "template" ? session : null}
      />
    );
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

  // An image sent to the chat from a template design reopens that design.
  if (sessionData?.kind === "template") {
    return <TemplateModeLoader params={params} session={sessionData} />;
  }

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

async function TemplateModeLoader({
  params,
  session,
}: {
  params: Awaited<StudioEditorLoaderProps["searchParams"]>;
  session: CanvasSessionData | null;
}) {
  const [assets, brandTemplates] = await Promise.all([
    getEditorAssets(params.client_id, params.user_id),
    listActiveBrandTemplatesForClient(params.client_id),
  ]);
  return (
    <ImageEditorStandalone
      params={{ ...params, mode: "templates", imageUrl: undefined }}
      logoAssets={assets.logoAssets}
      frameAssets={assets.frameAssets}
      fontAssets={assets.fontAssets}
      sessionData={null}
      allowCustomLogo={assets.allowCustomLogo}
      brandTemplates={brandTemplates}
      initialTemplateSession={session}
    />
  );
}

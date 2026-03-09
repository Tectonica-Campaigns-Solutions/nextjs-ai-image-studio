import dynamic from "next/dynamic";
import { getEditorAssetsForUser } from "./lib/get-editor-assets";
import { getCanvasSession } from "./lib/get-canvas-session";
import { StudioLoading } from "./studio-loading";

const ImageEditorStandalone = dynamic(
  () => import("./image-editor-standalone"),
  { loading: () => <StudioLoading /> }
);

type StudioEditorLoaderProps = {
  searchParams: Promise<{
    imageUrl?: string;
    user_id?: string;
    session_id?: string;
  }>;
};

/**
 * Async server component that fetches editor assets and session, then renders the editor.
 * Used inside Suspense so the parent can show a skeleton fallback while loading.
 */
export default async function StudioEditorLoader({
  searchParams,
}: StudioEditorLoaderProps) {
  const params = await searchParams;

  const [{ logoAssets, fontAssets, frameAssets, allowCustomLogo }, sessionData] =
    await Promise.all([
      getEditorAssetsForUser(params.user_id),
      params.session_id
        ? getCanvasSession(params.session_id)
        : Promise.resolve(null),
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

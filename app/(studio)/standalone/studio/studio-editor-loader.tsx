import dynamic from "next/dynamic";
import { getEditorAssetsForUser } from "./lib/get-editor-assets";
import { getCanvasSession } from "./lib/get-canvas-session";
import { StudioLoading } from "./studio-loading";
import { getClientStatusByUserId } from "./lib/get-client-status";

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
 * Used inside Suspense so the parent can show a skeleton fallback while loading
 */
export default async function StudioEditorLoader({
  searchParams,
}: StudioEditorLoaderProps) {
  const params = await searchParams;

  const clientStatus = await getClientStatusByUserId(params.user_id);

  if (!clientStatus.isActive) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#050505] px-4">
        <div className="max-w-md rounded-xl border border-white/10 bg-[#111111] px-6 py-7 text-center shadow-xl">
          <h1 className="text-lg font-semibold text-white mb-2">
            Account deactivated
          </h1>
          <p className="text-sm text-white/70">
            Your account is deactivated. Please contact an administrator to gain
            access to the Studio.
          </p>
        </div>
      </main>
    );
  }

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

import { Suspense } from "react";
import ImageEditorStandalone from "./image-editor-standalone";
import { getEditorAssetsForUser } from "./lib/get-editor-assets";
import { getCanvasSession } from "./lib/get-canvas-session";

type StudioPageProps = {
  searchParams: Promise<{
    imageUrl?: string;
    user_id?: string;
    session_id?: string;
  }>;
};

export default async function StudioPage({ searchParams }: StudioPageProps) {
  const params = await searchParams;

  const [{ logoAssets, fontAssets, frameAssets }, sessionData] = await Promise.all([
    getEditorAssetsForUser(params.user_id),
    params.session_id ? getCanvasSession(params.session_id) : Promise.resolve(null),
  ]);

  return (
    <Suspense fallback={<>...</>}>
      <ImageEditorStandalone
        params={params}
        logoAssets={logoAssets}
        frameAssets={frameAssets}
        fontAssets={fontAssets}
        sessionData={sessionData}
      />
    </Suspense>
  );
}

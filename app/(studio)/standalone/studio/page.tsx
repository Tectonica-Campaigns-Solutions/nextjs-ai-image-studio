import { Suspense } from "react";
import ImageEditorStandalone from "./image-editor-standalone";
import { getEditorAssetsForUser } from "./lib/get-editor-assets";

type StudioPageProps = {
  searchParams: Promise<{
    imageUrl?: string;
    user_id?: string;
    // CA Token for security?
  }>;
};

export default async function StudioPage({ searchParams }: StudioPageProps) {
  const params = await searchParams;
  const { logoAssets, fontAssets } = await getEditorAssetsForUser(params.user_id);

  return (
    <Suspense fallback={<>...</>}>
      <ImageEditorStandalone
        params={params}
        logoAssets={logoAssets}
        fontAssets={fontAssets}
      />
    </Suspense>
  );
}

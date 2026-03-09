import { getClientDetailGalleriesDataCached } from "@/app/(studio)/dashboard/data/clients";
import { ClientDetailGalleries } from "./client-detail-galleries";

interface ClientDetailGalleriesSectionProps {
  clientId: string;
  variants: string[];
}

export async function ClientDetailGalleriesSection({
  clientId,
  variants,
}: ClientDetailGalleriesSectionProps) {
  const data = await getClientDetailGalleriesDataCached(clientId);
  return (
    <ClientDetailGalleries
      clientId={clientId}
      variants={variants}
      data={data}
    />
  );
}

interface ClientDetailAssetsSectionProps {
  clientId: string;
  variants: string[];
}

export async function ClientDetailAssetsSection({
  clientId,
  variants,
}: ClientDetailAssetsSectionProps) {
  const data = await getClientDetailGalleriesDataCached(clientId);
  return (
    <ClientDetailGalleries
      clientId={clientId}
      variants={variants}
      data={data}
      showOnly="assets"
    />
  );
}

interface ClientDetailRestGalleriesSectionProps {
  clientId: string;
  variants: string[];
}

export async function ClientDetailRestGalleriesSection({
  clientId,
  variants,
}: ClientDetailRestGalleriesSectionProps) {
  const data = await getClientDetailGalleriesDataCached(clientId);
  return (
    <ClientDetailGalleries
      clientId={clientId}
      variants={variants}
      data={data}
      showOnly="rest"
    />
  );
}

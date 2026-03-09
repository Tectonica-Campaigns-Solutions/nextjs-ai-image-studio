import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getClientDetailHeaderData } from "@/app/(studio)/dashboard/data/clients";
import { ClientDetailHeaderForm } from "./client-detail-header-form";
import {
  ClientDetailAssetsSection,
  ClientDetailRestGalleriesSection,
} from "./client-detail-galleries-section";

interface ClientDetailHeaderSectionProps {
  clientId: string;
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      className={className}
      role="status"
      aria-label="Loading"
    >
      <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
    </div>
  );
}

function AssetsLoadingFallback() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 min-h-[200px] flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

function RestLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-16 min-h-[240px]">
      <LoadingSpinner />
    </div>
  );
}

export async function ClientDetailHeaderSection({
  clientId,
}: ClientDetailHeaderSectionProps) {
  const { client, variants } = await getClientDetailHeaderData(clientId);

  if (client === null) {
    notFound();
  }

  return (
    <ClientDetailHeaderForm
      client={client}
      variants={variants}
      clientId={clientId}
      galleryAssetsSlot={
        <Suspense fallback={<AssetsLoadingFallback />}>
          <ClientDetailAssetsSection clientId={clientId} variants={variants} />
        </Suspense>
      }
      galleryRestSlot={
        <Suspense fallback={<RestLoadingFallback />}>
          <ClientDetailRestGalleriesSection
            clientId={clientId}
            variants={variants}
          />
        </Suspense>
      }
    />
  );
}

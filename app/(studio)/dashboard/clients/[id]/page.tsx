import { notFound } from "next/navigation";
import {
  getClientById,
  getClientAssets,
  getClientFonts,
  getClientVariants,
} from "@/app/(studio)/dashboard/data/clients";
import { ClientDetailClient } from "@/app/(studio)/dashboard/components/client-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [client, assets, fonts, variants] = await Promise.all([
    getClientById(id),
    getClientAssets(id, "logo"),
    getClientFonts(id),
    getClientVariants(id),
  ]);

  if (client === null) {
    notFound();
  }

  return (
    <ClientDetailClient
      client={client}
      assets={assets ?? []}
      fonts={fonts ?? []}
      variants={variants ?? []}
    />
  );
}

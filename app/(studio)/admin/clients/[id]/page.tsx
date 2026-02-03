import { redirect } from "next/navigation";
import {
  getClientById,
  getClientAssets,
  getClientFonts,
  getClientVariants,
} from "@/app/(studio)/admin/data/clients";
import { ClientDetailClient } from "@/app/(studio)/admin/components/client-detail-client";

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
    redirect("/admin/clients");
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

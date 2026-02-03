import { redirect } from "next/navigation";
import { getClients } from "@/app/(studio)/admin/data/clients";
import { ClientsList } from "@/app/(studio)/admin/components/clients-list";

export default async function ClientsPage() {
  const clients = await getClients();

  if (clients === null) {
    redirect("/admin/login?error=admin_required");
  }

  return <ClientsList initialClients={clients} />;
}

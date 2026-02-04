import { redirect } from "next/navigation";
import { getClients } from "@/app/(studio)/dashboard/data/clients";
import { ClientsList } from "@/app/(studio)/dashboard/components/clients-list";

export default async function ClientsPage() {
  const clients = await getClients();

  if (clients === null) {
    redirect("/dashboard/login?error=admin_required");
  }

  return <ClientsList initialClients={clients} />;
}

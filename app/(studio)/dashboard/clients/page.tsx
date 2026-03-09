import { redirect } from "next/navigation";
import { getClientsListData } from "@/app/(studio)/dashboard/data/clients";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { ClientsList } from "@/app/(studio)/dashboard/components/clients-list";

export default async function ClientsPage() {
  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }
  const clients = await getClientsListData();
  if (clients === null) {
    redirect("/dashboard/login?error=admin_required");
  }

  return <ClientsList initialClients={clients} />;
}

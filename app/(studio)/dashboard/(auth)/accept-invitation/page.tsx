import { getAuthenticatedUser } from "@/app/(studio)/dashboard/features/auth/data/auth";
import { AcceptInvitationForm } from "@/app/(studio)/dashboard/components/accept-invitation-form";
import { AcceptInvitationHashHandler } from "@/app/(studio)/dashboard/components/accept-invitation-hash-handler";

export default async function AcceptInvitationPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return <AcceptInvitationHashHandler />;
  }

  return <AcceptInvitationForm userEmail={user.email ?? null} />;
}

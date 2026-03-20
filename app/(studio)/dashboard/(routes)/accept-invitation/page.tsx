import { getAuthenticatedUser } from "@/app/(studio)/dashboard/features/auth/data/auth";
import { AcceptInvitationForm } from "../../components/accept-invitation-form";
import { AcceptInvitationHashHandler } from "../../components/accept-invitation-hash-handler";

export default async function AcceptInvitationPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    // Token may be in the URL hash (invite link); the server never sees it.
    // Let the client component try to set the session from the hash, then reload.
    return <AcceptInvitationHashHandler />;
  }

  return <AcceptInvitationForm userEmail={user.email ?? null} />;
}

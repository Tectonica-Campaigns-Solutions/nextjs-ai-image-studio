import { createClient } from "@/lib/supabase/server";
import { AcceptInvitationForm } from "../components/accept-invitation-form";

export default async function AcceptInvitationPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return (
      <div className="min-h-screen bg-[#f0f1f2] flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 bg-white rounded-3xl border-0 shadow-drop-shadow text-center">
          <p className="text-destructive text-sm [font-family:'Manrope',Helvetica]">
            Invitation session is invalid or expired. Please request a new invitation.
          </p>
        </div>
      </div>
    );
  }

  return <AcceptInvitationForm userEmail={user.email ?? null} />;
}

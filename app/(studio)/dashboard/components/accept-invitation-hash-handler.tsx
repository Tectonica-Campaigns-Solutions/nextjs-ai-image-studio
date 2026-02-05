"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * When Supabase redirects after an invite, tokens are in the URL hash (fragment).
 * The server never receives the hash, so we must set the session client-side here,
 * then reload so the server can see the session.
 */
export function AcceptInvitationHashHandler() {
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    console.log("[AcceptInvitationHashHandler] Running");
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash) {
      console.log("[AcceptInvitationHashHandler] No hash in URL");
      setStatus("error");
      return;
    }

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");
    console.log("[AcceptInvitationHashHandler] Hash params:", {
      type,
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
    });

    if (type !== "invite" || !access_token || !refresh_token) {
      console.log("[AcceptInvitationHashHandler] Missing invite params or tokens");
      setStatus("error");
      return;
    }

    const supabase = createClient();
    console.log("[AcceptInvitationHashHandler] Calling setSession");
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          console.error("[AcceptInvitationHashHandler] setSession error:", error.message, error);
          setStatus("error");
          return;
        }
        console.log("[AcceptInvitationHashHandler] setSession success, redirecting");
        // Reload same path without hash so the server sees the session
        window.location.replace("/dashboard/accept-invitation");
      })
      .catch((err) => {
        console.error("[AcceptInvitationHashHandler] setSession catch:", err);
        setStatus("error");
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#f0f1f2] flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 bg-white rounded-3xl border-0 shadow-drop-shadow text-center">
          <p className="text-[#3b4451] text-sm [font-family:'Manrope',Helvetica]">
            Completing your invitation...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f1f2] flex items-center justify-center p-6">
      <div className="w-full max-w-md p-8 bg-white rounded-3xl border-0 shadow-drop-shadow text-center">
        <p className="text-destructive text-sm [font-family:'Manrope',Helvetica]">
          Invitation session is invalid or expired. Please request a new
          invitation.
        </p>
      </div>
    </div>
  );
}

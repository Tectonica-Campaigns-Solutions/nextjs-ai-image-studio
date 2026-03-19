"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ShieldAlert } from "lucide-react";

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
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-stitch-primary/10 text-stitch-primary flex items-center justify-center mb-4">
            <Loader2 className="size-6 animate-spin" />
          </div>
          <p className="text-on-surface text-sm font-medium">
            Completing your invitation...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md p-8 bg-surface-container-lowest/95 backdrop-blur-md border border-outline-variant/10 rounded-2xl shadow-sm shadow-on-surface/5 text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <ShieldAlert className="size-6" />
        </div>
        <p className="text-destructive text-sm">
          Invitation session is invalid or expired. Please request a new
          invitation.
        </p>
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /admin/auth/callback
 * Maneja el callback de autenticación de Supabase (incluyendo invitaciones)
 * Intercambia el código/token por una sesión y redirige a la página de aceptación
 */
export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get("code");
  const token = requestUrl.searchParams.get("token");
  const type = requestUrl.searchParams.get("type");
  const next =
    requestUrl.searchParams.get("next") || "/admin/accept-invitation";
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Si hay un error, redirigir al login con el error
  if (error) {
    const url = new URL("/admin/login", requestUrl.origin);
    url.searchParams.set(
      "error",
      error === "access_denied" ? "invitation_expired" : error
    );
    if (errorDescription) {
      url.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      code
    );

    if (exchangeError) {
      console.error("Error exchanging code for session:", exchangeError);
      const url = new URL("/admin/login", requestUrl.origin);
      url.searchParams.set("error", "invalid_invitation");
      return NextResponse.redirect(url);
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  if (token && type === "invite") {
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: "invite",
    });

    if (verifyError || !data?.user) {
      console.error("Error verifying invitation token:", verifyError);
      const url = new URL("/admin/login", requestUrl.origin);
      url.searchParams.set("error", "invalid_invitation");
      return NextResponse.redirect(url);
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

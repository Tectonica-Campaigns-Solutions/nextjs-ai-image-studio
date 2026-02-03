import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

async function checkAdminRole(
  userId: string,
  request: NextRequest
): Promise<boolean> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // No-op in middleware
          },
        },
      }
    );

    const { data: role, error } = await supabase
      .from("user_roles")
      .select("role, expires_at")
      .eq("user_id", userId)
      .eq("role", "admin")
      .eq("is_active", true)
      .maybeSingle();

    if (error || !role) {
      return false;
    }

    // Verificar que no haya expirado
    if (role.expires_at) {
      return new Date(role.expires_at) > new Date();
    }

    return true;
  } catch (error) {
    console.error("Error checking admin role in middleware:", error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Solo proteger rutas de páginas /admin/* (no APIs, no login, no accept-invitation, no auth callbacks)
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/accept-invitation") &&
    !pathname.startsWith("/admin/auth/callback") &&
    !pathname.startsWith("/api")
  ) {
    let response = NextResponse.next({
      request,
    });

    // Crear cliente de Supabase para admin
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Verificar autenticación
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    // Verificar rol admin
    const isAdmin = await checkAdminRole(user.id, request);
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "admin_required");
      return NextResponse.redirect(url);
    }

    return response;
  }

  // Para todas las demás rutas, permitir el acceso
  return NextResponse.next({
    request,
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (handled separately)
     * - standalone routes
     * - static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|standalone|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

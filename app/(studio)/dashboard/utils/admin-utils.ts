import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Check if the current user has admin role
 * @returns true if the user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return false;
    }

    const { data: role, error } = await supabase
      .from("user_roles")
      .select("role, expires_at")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Error checking admin role:", error);
      return false;
    }

    // If no role, not admin
    if (!role) {
      return false;
    }

    // If expires_at exists, check that it has not expired
    if (role.expires_at) {
      return new Date(role.expires_at) > new Date();
    }

    return true;
  } catch (error) {
    console.error("Error in isAdmin:", error);
    return false;
  }
}

/**
 * Requires that the user be admin, returns error 403 if not
 * Useful to use in API routes
 */
export async function requireAdmin(): Promise<
  | { success: true; user: { id: string } }
  | { success: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const admin = await isAdmin();
  if (!admin) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { success: true, user: { id: user.id } };
}

/**
 * Gets the current user and checks if they are admin
 * Returns both the user and the admin status
 */
export async function getCurrentUserWithRole() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, isAdmin: false };
  }

  const admin = await isAdmin();
  return { user, isAdmin: admin };
}

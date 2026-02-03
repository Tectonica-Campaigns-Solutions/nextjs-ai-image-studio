import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setupPasswordSchema } from "@/app/(studio)/admin/schemas/auth";
import { errorResponse } from "@/app/api/admin/_lib/api-response";

/**
 * POST /api/admin/setup-password
 * Configure the user's password after accepting the invitation
 * and activate the admin role. The user must be authenticated with a valid invitation session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = setupPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const msg =
        parsed.error.flatten().fieldErrors.password?.[0] ?? "Validation failed";
      return errorResponse(String(msg), 400);
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return errorResponse(
        "Invalid or expired invitation. Please request a new invitation.",
        401
      );
    }

    const adminSupabase = await createClient();
    const { data: adminRole, error: roleError } = await adminSupabase
      .from("user_roles")
      .select("id, is_active")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      return errorResponse("User does not have an admin role", 403);
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (updateError) {
      return errorResponse("Failed to update password", 500);
    }

    const { error: activateError } = await adminSupabase
      .from("user_roles")
      .update({ is_active: true })
      .eq("id", adminRole.id);

    if (activateError) {
      return errorResponse(
        "Password updated but failed to activate admin role",
        500
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password configured successfully. You can now log in.",
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

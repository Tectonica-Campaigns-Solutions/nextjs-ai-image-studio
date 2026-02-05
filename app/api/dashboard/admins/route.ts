import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { createAdminSchema } from "@/app/(studio)/dashboard/schemas/admins";
import { errorResponse } from "@/app/api/dashboard/_lib/api-response";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/dashboard/admins
 * Lists all admins with user information
 */
export async function GET(_request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  try {
    const supabase = createAdminClient();
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select(
        "id, user_id, role, granted_by, granted_at, expires_at, is_active",
      )
      .eq("role", "admin")
      .order("granted_at", { ascending: false });

    if (rolesError) {
      return errorResponse("Failed to fetch admins", 500);
    }

    const adminsWithDetails = await Promise.all(
      (adminRoles || []).map(async (role) => {
        try {
          const { data: userData, error: userError } =
            await supabase.auth.admin.getUserById(role.user_id);
          let email = "N/A";
          if (!userError && userData?.user) {
            email = userData.user.email || "N/A";
          }
          let grantedByEmail: string | null = null;
          if (role.granted_by) {
            const { data: granterData } = await supabase.auth.admin.getUserById(
              role.granted_by,
            );
            if (granterData?.user)
              grantedByEmail = granterData.user.email ?? null;
          }
          return {
            id: role.id,
            user_id: role.user_id,
            email,
            role: role.role,
            granted_by: role.granted_by,
            granted_by_email: grantedByEmail,
            granted_at: role.granted_at,
            expires_at: role.expires_at,
            is_active: role.is_active,
          };
        } catch {
          return {
            id: role.id,
            user_id: role.user_id,
            email: "Error loading email",
            role: role.role,
            granted_by: role.granted_by,
            granted_by_email: null,
            granted_at: role.granted_at,
            expires_at: role.expires_at,
            is_active: role.is_active,
          };
        }
      }),
    );

    return NextResponse.json({ admins: adminsWithDetails });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/dashboard/admins
 */
export async function POST(request: NextRequest) {
  console.log("[POST /api/dashboard/admins] Request started");
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) {
    console.log("[POST /api/dashboard/admins] Admin check failed");
    return adminCheck.response;
  }

  try {
    const body = await request.json();
    console.log(
      "[POST /api/dashboard/admins] Body received:",
      JSON.stringify(body),
    );
    const parsed = createAdminSchema.safeParse(body);
    if (!parsed.success) {
      console.log(
        "[POST /api/dashboard/admins] Validation failed:",
        parsed.error.flatten(),
      );
      const msg =
        parsed.error.flatten().formErrors[0] ??
        parsed.error.flatten().fieldErrors.expires_at?.[0] ??
        "Validation failed";
      return errorResponse(String(msg), 400);
    }
    const { email, expires_at } = parsed.data;
    console.log(
      "[POST /api/dashboard/admins] Parsed email:",
      email,
      "expires_at:",
      expires_at,
    );
    const supabase = createAdminClient();

    const requestUrl =
      request.headers.get("origin") || request.headers.get("referer") || "";
    const baseUrl = requestUrl
      ? new URL(requestUrl).origin
      : process.env.NEXT_PUBLIC_SITE_URL || "";
    const redirectTo = baseUrl
      ? `${baseUrl}/dashboard/auth/callback?next=/dashboard/accept-invitation`
      : undefined;
    console.log("[POST /api/dashboard/admins] redirectTo:", redirectTo);

    let createdUser;
    const inviteOptions: { data: { role: string }; redirectTo?: string } = {
      data: { role: "admin" },
    };
    if (redirectTo) inviteOptions.redirectTo = redirectTo;

    console.log(
      "[POST /api/dashboard/admins] Calling inviteUserByEmail with:",
      { email, inviteOptions },
    );
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email, inviteOptions);

    if (inviteError) {
      console.log(
        "[POST /api/dashboard/admins] inviteUserByEmail error:",
        inviteError.message,
        inviteError,
      );
      if (
        inviteError.message.includes("already registered") ||
        inviteError.message.includes("already exists")
      ) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase(),
        );
        console.log(
          "[POST /api/dashboard/admins] Existing user lookup:",
          existingUser ? "found" : "not found",
        );
        if (existingUser) createdUser = existingUser;
        else
          return errorResponse(
            "User already exists but could not be retrieved",
            409,
          );
      } else {
        console.log(
          "[POST /api/dashboard/admins] Invite error not recoverable, returning 500",
        );
        return errorResponse("Failed to send invitation", 500);
      }
    } else {
      createdUser = inviteData?.user;
      console.log(
        "[POST /api/dashboard/admins] Invite success, user id:",
        createdUser?.id,
      );
    }

    if (!createdUser) {
      console.log(
        "[POST /api/dashboard/admins] No createdUser after invite flow",
      );
      return errorResponse("Failed to create or retrieve user", 500);
    }

    const userId = createdUser.id;
    const { data: existingRole, error: existingRoleError } = await supabase
      .from("user_roles")
      .select("id, is_active")
      .eq("user_id", userId)
      .eq("role", "admin")
      .eq("is_active", true)
      .maybeSingle();

    console.log("[POST /api/dashboard/admins] existingRole check:", {
      existingRole,
      existingRoleError,
    });

    if (existingRole) {
      console.log(
        "[POST /api/dashboard/admins] User already has active admin role",
      );
      return errorResponse("This user already has an active admin role", 409);
    }

    const { error: updateError } = await supabase
      .from("user_roles")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);
    console.log(
      "[POST /api/dashboard/admins] Deactivate previous roles update:",
      updateError ?? "ok",
    );

    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "admin",
        granted_by: adminCheck.user.id,
        expires_at: expires_at ?? null,
        is_active: false,
      })
      .select()
      .single();

    if (roleError) {
      console.log(
        "[POST /api/dashboard/admins] insert user_roles error:",
        roleError.message,
        roleError,
      );
      return errorResponse("Failed to create admin role", 500);
    }
    console.log(
      "[POST /api/dashboard/admins] Admin role created successfully:",
      role?.id,
    );

    return NextResponse.json(
      {
        admin: {
          id: role.id,
          user_id: userId,
          email,
          role: role.role,
          granted_by: role.granted_by,
          granted_at: role.granted_at,
          expires_at: role.expires_at,
          is_active: role.is_active,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/dashboard/admins] Unhandled error:", err);
    return errorResponse("Internal server error", 500);
  }
}

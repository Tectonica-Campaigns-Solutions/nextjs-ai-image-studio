import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/admin/utils/admin-utils";
import { updateAdminSchema } from "@/app/(studio)/admin/schemas/admins";
import {
  errorResponse,
  validateIdParam,
} from "@/app/api/admin/_lib/api-response";
import { NextRequest, NextResponse } from "next/server";

async function getParams(
  params: Promise<{ id: string }>
): Promise<{ id: string; error: null } | { id: null; error: NextResponse }> {
  const { id } = await params;
  const invalid = validateIdParam(id);
  if (invalid) return { id: null, error: invalid };
  return { id, error: null };
}

/**
 * GET /api/admin/admins/[id]
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const paramsResult = await getParams(context.params);
  if (paramsResult.error) return paramsResult.error;
  const { id } = paramsResult;

  try {
    const supabase = await createClient();
    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("*")
      .eq("id", id)
      .eq("role", "admin")
      .single();

    if (roleError) {
      if (roleError.code === "PGRST116") {
        return errorResponse("Admin not found", 404);
      }
      return errorResponse("Failed to fetch admin", 500);
    }

    let email = "N/A";
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(role.user_id);
    if (!userError && userData?.user) email = userData.user.email || "N/A";

    let grantedByEmail: string | null = null;
    if (role.granted_by) {
      const { data: granterData } = await supabase.auth.admin.getUserById(
        role.granted_by
      );
      if (granterData?.user) grantedByEmail = granterData.user.email ?? null;
    }

    return NextResponse.json({
      admin: {
        id: role.id,
        user_id: role.user_id,
        email,
        role: role.role,
        granted_by: role.granted_by,
        granted_by_email: grantedByEmail,
        granted_at: role.granted_at,
        expires_at: role.expires_at,
        is_active: role.is_active,
      },
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/admin/admins/[id]
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const paramsResult = await getParams(context.params);
  if (paramsResult.error) return paramsResult.error;
  const { id } = paramsResult;

  try {
    const body = await request.json();
    const parsed = updateAdminSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message =
        (Object.values(first)[0]?.[0] as string) ?? "Validation failed";
      return errorResponse(message, 400);
    }

    const supabase = await createClient();
    const { data: existingRole, error: fetchError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("id", id)
      .eq("role", "admin")
      .single();

    if (fetchError || !existingRole) {
      return errorResponse("Admin not found", 404);
    }
    if (existingRole.user_id === adminCheck.user.id) {
      return errorResponse("You cannot modify your own admin status", 403);
    }

    const updateData: { is_active?: boolean; expires_at?: string | null } = {};
    if (parsed.data.is_active !== undefined)
      updateData.is_active = parsed.data.is_active;
    if (parsed.data.expires_at !== undefined)
      updateData.expires_at = parsed.data.expires_at;

    const { data: updatedRole, error: updateError } = await supabase
      .from("user_roles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return errorResponse("Failed to update admin", 500);
    }

    let email = "N/A";
    const { data: userData } = await supabase.auth.admin.getUserById(
      updatedRole.user_id
    );
    if (userData?.user) email = userData.user.email || "N/A";

    return NextResponse.json({
      admin: {
        id: updatedRole.id,
        user_id: updatedRole.user_id,
        email,
        role: updatedRole.role,
        granted_by: updatedRole.granted_by,
        granted_at: updatedRole.granted_at,
        expires_at: updatedRole.expires_at,
        is_active: updatedRole.is_active,
      },
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * DELETE /api/admin/admins/[id]
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const { id, error: paramError } = await getParams(context.params);
  if (paramError) return paramError;

  try {
    const supabase = await createClient();
    const { data: existingRole, error: fetchError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("id", id)
      .eq("role", "admin")
      .single();

    if (fetchError || !existingRole) {
      return errorResponse("Admin not found", 404);
    }
    if (existingRole.user_id === adminCheck.user.id) {
      return errorResponse("You cannot delete your own admin account", 403);
    }

    const { error: deleteError } = await supabase
      .from("user_roles")
      .update({ is_active: false })
      .eq("id", id);

    if (deleteError) {
      return errorResponse("Failed to delete admin", 500);
    }
    return NextResponse.json({ success: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import type { Admin } from "@/app/(studio)/dashboard/types";

export async function getAdmins(): Promise<Admin[] | null> {
  const check = await requireAdmin();
  if (!check.success) return null;
  const supabase = createAdminClient();
  const { data: adminRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("id, user_id, role, granted_by, granted_at, expires_at, is_active")
    .eq("role", "admin")
    .order("granted_at", { ascending: false });

  if (rolesError) return null;

  const admins: Admin[] = [];
  for (const role of adminRoles ?? []) {
    let email = "N/A";
    try {
      const { data: userData, error: userError } =
        await supabase.auth.admin.getUserById(role.user_id);
      if (!userError && userData?.user) email = userData.user.email || "N/A";
    } catch {
      // ignore
    }
    let grantedByEmail: string | null = null;
    if (role.granted_by) {
      try {
        const { data: granterData } = await supabase.auth.admin.getUserById(
          role.granted_by,
        );
        if (granterData?.user) grantedByEmail = granterData.user.email ?? null;
      } catch {
        // ignore
      }
    }
    admins.push({
      id: role.id,
      user_id: role.user_id,
      email,
      role: role.role,
      granted_by: role.granted_by,
      granted_by_email: grantedByEmail,
      granted_at: role.granted_at,
      expires_at: role.expires_at,
      is_active: role.is_active,
    });
  }
  return admins;
}

export async function getAdminById(id: string): Promise<Admin | null> {
  const check = await requireAdmin();
  if (!check.success) return null;
  const supabase = createAdminClient();
  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("*")
    .eq("id", id)
    .eq("role", "admin")
    .single();

  if (roleError || !role) return null;

  let email = "N/A";
  try {
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(role.user_id);
    if (!userError && userData?.user) email = userData.user.email || "N/A";
  } catch {
    // ignore
  }
  let grantedByEmail: string | null = null;
  if (role.granted_by) {
    try {
      const { data: granterData } = await supabase.auth.admin.getUserById(
        role.granted_by,
      );
      if (granterData?.user) grantedByEmail = granterData.user.email ?? null;
    } catch {
      // ignore
    }
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
  } as Admin;
}

/** Returns current user id if authenticated and admin; null otherwise. */
export async function getCurrentUserId(): Promise<string | null> {
  const check = await requireAdmin();
  if (!check.success) return null;
  return check.user.id;
}

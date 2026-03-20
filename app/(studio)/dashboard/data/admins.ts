import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import type { Admin } from "@/app/(studio)/dashboard/types";

/** Safely reads full_name / display_name from Supabase auth user_metadata. */
function extractDisplayName(
  userMetadata: Record<string, unknown> | null | undefined
): string | null {
  if (!userMetadata) return null;
  const name = userMetadata.full_name ?? userMetadata.display_name;
  return typeof name === "string" ? name : null;
}

/**
 * Fetches all admins. Does NOT call requireAdmin - the page must do that first.
 * User and granter fetches are parallelized per role (Promise.all).
 */
export async function getAdminsListData(): Promise<Admin[] | null> {
  const supabase = createAdminClient();
  const { data: adminRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("id, user_id, role, granted_by, granted_at, expires_at, is_active")
    .eq("role", "admin")
    .order("granted_at", { ascending: false });

  if (rolesError) return null;

  const admins = await Promise.all(
    (adminRoles ?? []).map(async (role) => {
      const [userRes, granterRes] = await Promise.all([
        supabase.auth.admin.getUserById(role.user_id),
        role.granted_by
          ? supabase.auth.admin.getUserById(role.granted_by)
          : Promise.resolve({ data: { user: null }, error: null }),
      ]);
      let email = "N/A";
      let displayName: string | null = null;
      try {
        if (!userRes.error && userRes.data?.user) {
          const u = userRes.data.user;
          email = u.email || "N/A";
          displayName = extractDisplayName(u.user_metadata);
        }
      } catch {
        // ignore
      }
      let grantedByEmail: string | null = null;
      try {
        if (granterRes.data?.user)
          grantedByEmail = granterRes.data.user.email ?? null;
      } catch {
        // ignore
      }
      return {
        id: role.id,
        user_id: role.user_id,
        email,
        display_name: displayName,
        role: role.role,
        granted_by: role.granted_by,
        granted_by_email: grantedByEmail,
        granted_at: role.granted_at,
        expires_at: role.expires_at,
        is_active: role.is_active,
      } as Admin;
    })
  );
  return admins;
}

export async function getAdmins(): Promise<Admin[] | null> {
  const check = await requireAdmin();
  if (!check.success) return null;
  return getAdminsListData();
}

/**
 * Fetches one admin by id. Does NOT call requireAdmin - the page must do that first.
 */
export async function getAdminDetailData(id: string): Promise<Admin | null> {
  const supabase = createAdminClient();
  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("*")
    .eq("id", id)
    .eq("role", "admin")
    .single();

  if (roleError || !role) return null;

  let email = "N/A";
  let displayName: string | null = null;
  try {
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(role.user_id);
    if (!userError && userData?.user) {
      const u = userData.user;
      email = u.email || "N/A";
      displayName = extractDisplayName(u.user_metadata);
    }
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
    display_name: displayName,
    role: role.role,
    granted_by: role.granted_by,
    granted_by_email: grantedByEmail,
    granted_at: role.granted_at,
    expires_at: role.expires_at,
    is_active: role.is_active,
  } as Admin;
}

export async function getAdminById(id: string): Promise<Admin | null> {
  const check = await requireAdmin();
  if (!check.success) return null;
  return getAdminDetailData(id);
}

/** Returns current user id if authenticated and admin; null otherwise. */
export async function getCurrentUserId(): Promise<string | null> {
  const check = await requireAdmin();
  if (!check.success) return null;
  return check.user.id;
}

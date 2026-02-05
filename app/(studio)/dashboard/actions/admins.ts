"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import {
  createAdminSchema,
  updateAdminSchema,
} from "@/app/(studio)/dashboard/schemas/admins";
import type {
  CreateAdminInput,
  UpdateAdminInput,
} from "@/app/(studio)/dashboard/schemas/admins";
import { isValidUUID } from "@/app/(studio)/dashboard/schemas/params";

export type AdminActionResult = { error?: string };

export async function createAdminAction(
  raw: CreateAdminInput,
): Promise<AdminActionResult> {
  console.log("[createAdminAction] Started", { raw });
  const check = await requireAdmin();
  if (!check.success) {
    console.log("[createAdminAction] Admin check failed, redirecting");
    redirect("/dashboard/login?error=admin_required");
  }

  const parsed = createAdminSchema.safeParse(raw);
  if (!parsed.success) {
    console.log(
      "[createAdminAction] Validation failed:",
      parsed.error.flatten(),
    );
    const msg =
      parsed.error.flatten().formErrors[0] ??
      parsed.error.flatten().fieldErrors.expires_at?.[0] ??
      "Validation failed";
    return { error: String(msg) };
  }

  const { email, expires_at } = parsed.data;
  console.log("[createAdminAction] Parsed:", { email, expires_at });
  const supabase = createAdminClient();

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000");
  const redirectTo = `${baseUrl}/dashboard/auth/callback?next=/dashboard/accept-invitation`;
  console.log("[createAdminAction] redirectTo:", redirectTo);

  const inviteOptions: { data: { role: string }; redirectTo: string } = {
    data: { role: "admin" },
    redirectTo,
  };

  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(email, inviteOptions);

  let createdUser = inviteData?.user;
  if (inviteError) {
    console.log(
      "[createAdminAction] inviteUserByEmail error:",
      inviteError.message,
      inviteError,
    );
    if (
      inviteError.message.includes("already registered") ||
      inviteError.message.includes("already exists")
    ) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      createdUser =
        existingUsers?.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase(),
        ) ?? null;
      console.log(
        "[createAdminAction] Existing user lookup:",
        createdUser ? "found" : "not found",
      );
      if (!createdUser)
        return { error: "User already exists but could not be retrieved" };
    } else {
      return { error: "Failed to send invitation" };
    }
  } else {
    console.log(
      "[createAdminAction] Invite success, user id:",
      createdUser?.id,
    );
  }

  if (!createdUser) {
    console.log("[createAdminAction] No createdUser");
    return { error: "Failed to create or retrieve user" };
  }

  const userId = createdUser.id;
  const { data: existingRole, error: existingRoleError } = await supabase
    .from("user_roles")
    .select("id, is_active")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("is_active", true)
    .maybeSingle();

  console.log("[createAdminAction] existingRole:", {
    existingRole,
    existingRoleError,
  });

  if (existingRole) {
    console.log("[createAdminAction] User already has active admin role");
    return { error: "This user already has an active admin role" };
  }

  const { error: updateError } = await supabase
    .from("user_roles")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);
  console.log(
    "[createAdminAction] Deactivate previous roles:",
    updateError ?? "ok",
  );

  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: userId,
    role: "admin",
    granted_by: check.user.id,
    expires_at: expires_at ?? null,
    is_active: false,
  });

  if (roleError) {
    console.log(
      "[createAdminAction] insert user_roles error:",
      roleError.message,
      roleError,
    );
    return { error: "Failed to create admin role" };
  }
  console.log("[createAdminAction] Success");
  revalidatePath("/dashboard/admins");
  return {};
}

export async function updateAdminAction(
  adminId: string,
  raw: UpdateAdminInput,
): Promise<AdminActionResult> {
  console.log("[updateAdminAction] Started", { adminId, raw });
  const check = await requireAdmin();
  if (!check.success) {
    console.log("[updateAdminAction] Admin check failed");
    redirect("/dashboard/login?error=admin_required");
  }
  if (!isValidUUID(adminId)) {
    console.log("[updateAdminAction] Invalid admin ID");
    return { error: "Invalid admin ID" };
  }

  const parsed = updateAdminSchema.safeParse(raw);
  if (!parsed.success) {
    console.log(
      "[updateAdminAction] Validation failed:",
      parsed.error.flatten(),
    );
    const msg =
      Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ??
      "Validation failed";
    return { error: String(msg) };
  }

  const supabase = await createClient();
  const { data: existingRole, error: fetchError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("id", adminId)
    .eq("role", "admin")
    .single();

  console.log("[updateAdminAction] Fetch existing role:", {
    existingRole,
    fetchError,
  });

  if (fetchError || !existingRole) return { error: "Admin not found" };
  if (existingRole.user_id === check.user.id) {
    console.log("[updateAdminAction] User tried to modify own status");
    return { error: "You cannot modify your own admin status" };
  }

  const updateData: { is_active?: boolean; expires_at?: string | null } = {};
  if (parsed.data.is_active !== undefined)
    updateData.is_active = parsed.data.is_active;
  if (parsed.data.expires_at !== undefined)
    updateData.expires_at = parsed.data.expires_at;
  console.log("[updateAdminAction] updateData:", updateData);

  const { error } = await supabase
    .from("user_roles")
    .update(updateData)
    .eq("id", adminId);

  if (error) {
    console.log("[updateAdminAction] Update error:", error.message, error);
    return { error: "Failed to update admin" };
  }
  console.log("[updateAdminAction] Success");
  revalidatePath("/dashboard/admins");
  revalidatePath(`/dashboard/admins/${adminId}`);
  return {};
}

export async function deleteAdminAction(
  adminId: string,
): Promise<AdminActionResult> {
  console.log("[deleteAdminAction] Started", { adminId });
  const check = await requireAdmin();
  if (!check.success) {
    console.log("[deleteAdminAction] Admin check failed");
    redirect("/dashboard/login?error=admin_required");
  }
  if (!isValidUUID(adminId)) {
    console.log("[deleteAdminAction] Invalid admin ID");
    return { error: "Invalid admin ID" };
  }

  const supabase = await createClient();
  const { data: existingRole, error: fetchError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("id", adminId)
    .eq("role", "admin")
    .single();

  console.log("[deleteAdminAction] Fetch existing role:", {
    existingRole,
    fetchError,
  });

  if (fetchError || !existingRole) return { error: "Admin not found" };
  if (existingRole.user_id === check.user.id) {
    console.log("[deleteAdminAction] User tried to delete own account");
    return { error: "You cannot delete your own admin account" };
  }

  const { error } = await supabase
    .from("user_roles")
    .update({ is_active: false })
    .eq("id", adminId);

  if (error) {
    console.log(
      "[deleteAdminAction] Update (deactivate) error:",
      error.message,
      error,
    );
    return { error: "Failed to delete admin" };
  }
  console.log("[deleteAdminAction] Success");
  revalidatePath("/dashboard/admins");
  revalidatePath(`/dashboard/admins/${adminId}`);
  return {};
}

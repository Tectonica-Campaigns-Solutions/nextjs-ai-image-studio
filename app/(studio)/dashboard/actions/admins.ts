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
import { setupPasswordSchema } from "@/app/(studio)/dashboard/schemas/auth";
import { firstZodError } from "@/app/(studio)/dashboard/utils/validation-helpers";

export type AdminActionResult = { error?: string };

export async function createAdminAction(
  raw: CreateAdminInput,
): Promise<AdminActionResult> {
  const check = await requireAdmin();
  if (!check.success) {
    redirect("/dashboard/login?error=admin_required");
  }

  const parsed = createAdminSchema.safeParse(raw);
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().formErrors[0] ??
      parsed.error.flatten().fieldErrors.expires_at?.[0] ??
      "Validation failed";
    return { error: String(msg) };
  }

  const { email, expires_at } = parsed.data;
  const supabase = createAdminClient();

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "http://localhost:3000";
  const redirectTo = `${baseUrl}/dashboard/auth/callback?next=/dashboard/accept-invitation`;

  const inviteOptions: { data: { role: string }; redirectTo: string } = {
    data: { role: "admin" },
    redirectTo,
  };

  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(email, inviteOptions);

  let createdUser = inviteData?.user;
  if (inviteError) {
    if (
      inviteError.message.includes("already registered") ||
      inviteError.message.includes("already exists")
    ) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      createdUser =
        existingUsers?.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase(),
        ) ?? null;
      if (!createdUser)
        return { error: "User already exists but could not be retrieved" };
    } else {
      return { error: "Failed to send invitation" };
    }
  }

  if (!createdUser) {
    return { error: "Failed to create or retrieve user" };
  }

  const userId = createdUser.id;
  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("id, is_active")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("is_active", true)
    .maybeSingle();

  if (existingRole) {
    return { error: "This user already has an active admin role" };
  }

  await supabase
    .from("user_roles")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: userId,
    role: "admin",
    granted_by: check.user.id,
    expires_at: expires_at ?? null,
    is_active: false,
  });

  if (roleError) {
    console.error("[createAdminAction] insert user_roles error:", roleError.message);
    return { error: "Failed to create admin role" };
  }

  revalidatePath("/dashboard/admins");
  return {};
}

export async function updateAdminAction(
  adminId: string,
  raw: UpdateAdminInput,
): Promise<AdminActionResult> {
  const check = await requireAdmin();
  if (!check.success) {
    redirect("/dashboard/login?error=admin_required");
  }
  if (!isValidUUID(adminId)) {
    return { error: "Invalid admin ID" };
  }

  const parsed = updateAdminSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const supabase = await createClient();
  const { data: existingRole, error: fetchError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("id", adminId)
    .eq("role", "admin")
    .single();

  if (fetchError || !existingRole) return { error: "Admin not found" };

  // Server-side self-edit guard: admins cannot change their own is_active status.
  const isSelfEdit = existingRole.user_id === check.user.id;
  const updateData: { is_active?: boolean; expires_at?: string | null } = {};

  if (isSelfEdit) {
    if (parsed.data.expires_at !== undefined)
      updateData.expires_at = parsed.data.expires_at;
  } else {
    if (parsed.data.is_active !== undefined)
      updateData.is_active = parsed.data.is_active;
    if (parsed.data.expires_at !== undefined)
      updateData.expires_at = parsed.data.expires_at;
  }

  const { error } = await supabase
    .from("user_roles")
    .update(updateData)
    .eq("id", adminId);

  if (error) {
    console.error("[updateAdminAction] update error:", error.message);
    return { error: "Failed to update admin" };
  }

  if (parsed.data.display_name !== undefined) {
    const adminSupabase = createAdminClient();
    const { error: metaError } = await adminSupabase.auth.admin.updateUserById(
      existingRole.user_id,
      { user_metadata: { full_name: parsed.data.display_name ?? "" } }
    );
    if (metaError) {
      console.error("[updateAdminAction] updateUserById user_metadata:", metaError.message);
      return { error: "Failed to update name" };
    }
  }

  revalidatePath("/dashboard/admins");
  revalidatePath(`/dashboard/admins/${adminId}`);
  return {};
}

export async function deleteAdminAction(
  adminId: string,
): Promise<AdminActionResult> {
  const check = await requireAdmin();
  if (!check.success) {
    redirect("/dashboard/login?error=admin_required");
  }
  if (!isValidUUID(adminId)) {
    return { error: "Invalid admin ID" };
  }

  const supabase = await createClient();
  const { data: existingRole, error: fetchError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("id", adminId)
    .eq("role", "admin")
    .single();

  if (fetchError || !existingRole) return { error: "Admin not found" };

  // Server-side self-delete guard.
  if (existingRole.user_id === check.user.id) {
    return { error: "You cannot delete your own admin account" };
  }

  const { error } = await supabase
    .from("user_roles")
    .update({ is_active: false })
    .eq("id", adminId);

  if (error) {
    console.error("[deleteAdminAction] deactivate error:", error.message);
    return { error: "Failed to delete admin" };
  }

  revalidatePath("/dashboard/admins");
  revalidatePath(`/dashboard/admins/${adminId}`);
  return {};
}

export type SetAdminPasswordResult = { error?: string };

export async function setAdminPasswordAction(
  targetUserId: string,
  raw: { password: string; confirmPassword: string }
): Promise<SetAdminPasswordResult> {
  const check = await requireAdmin();
  if (!check.success) {
    redirect("/dashboard/login?error=admin_required");
  }

  const parsed = setupPasswordSchema.safeParse({ password: raw.password });
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.password?.[0] ?? "Invalid password";
    return { error: String(msg) };
  }
  if (raw.password !== raw.confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const supabase = await createClient();
  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", targetUserId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !role) {
    return { error: "Admin not found" };
  }

  const adminSupabase = createAdminClient();
  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
    targetUserId,
    { password: parsed.data.password }
  );

  if (updateError) {
    console.error("[setAdminPasswordAction] updateUserById error:", updateError.message);
    return { error: "Failed to update password" };
  }

  revalidatePath("/dashboard/admins");
  revalidatePath(`/dashboard/admins/${role.id}`);
  return {};
}

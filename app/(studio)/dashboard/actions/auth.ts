"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { setupPasswordSchema } from "@/app/(studio)/dashboard/schemas/auth";

export type SetupPasswordResult = { error?: string };

export async function setupPasswordAction(raw: {
  password: string;
  confirmPassword?: string;
}): Promise<SetupPasswordResult> {
  console.log("[setupPasswordAction] Started");
  const parsed = setupPasswordSchema.safeParse({
    password: raw.password,
  });
  if (!parsed.success) {
    console.log(
      "[setupPasswordAction] Validation failed:",
      parsed.error.flatten(),
    );
    const msg =
      parsed.error.flatten().fieldErrors.password?.[0] ?? "Validation failed";
    return { error: String(msg) };
  }
  if (
    raw.confirmPassword !== undefined &&
    raw.password !== raw.confirmPassword
  ) {
    console.log("[setupPasswordAction] Passwords do not match");
    return { error: "Passwords do not match" };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log(
    "[setupPasswordAction] getUser:",
    user ? { userId: user.id } : "no user",
    userError ?? "ok",
  );

  if (userError || !user) {
    console.log(
      "[setupPasswordAction] No valid session:",
      userError?.message ?? "no user",
    );
    return {
      error: "Invalid or expired invitation. Please request a new invitation.",
    };
  }

  // Use admin client: RLS likely blocks the invited user from reading their own row in user_roles
  const adminSupabase = createAdminClient();
  const { data: adminRole, error: roleError } = await adminSupabase
    .from("user_roles")
    .select("id, is_active")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  console.log("[setupPasswordAction] admin role lookup:", {
    adminRole: !!adminRole,
    roleError: roleError?.message,
  });

  if (roleError || !adminRole) {
    console.log({ roleError, adminRole });

    console.log(
      "[setupPasswordAction] User has no admin role. User Id:",
      user.id,
    );
    return { error: "User does not have an admin role" };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (updateError) {
    console.error(
      "[setupPasswordAction] updateUser error:",
      updateError.message,
      updateError,
    );
    return { error: "Failed to update password" };
  }
  console.log("[setupPasswordAction] Password updated");

  const { error: activateError } = await adminSupabase
    .from("user_roles")
    .update({ is_active: true })
    .eq("id", adminRole.id);
  if (activateError) {
    console.error(
      "[setupPasswordAction] activate role error:",
      activateError.message,
      activateError,
    );
    return { error: "Password updated but failed to activate admin role" };
  }
  console.log(
    "[setupPasswordAction] Admin role activated, redirecting to login",
  );
  redirect("/dashboard/login");
}

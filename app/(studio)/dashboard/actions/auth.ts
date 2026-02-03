"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setupPasswordSchema } from "@/app/(studio)/dashboard/schemas/auth";

export type SetupPasswordResult = { error?: string };

export async function setupPasswordAction(raw: {
  password: string;
  confirmPassword?: string;
}): Promise<SetupPasswordResult> {
  const parsed = setupPasswordSchema.safeParse({
    password: raw.password,
  });
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.password?.[0] ?? "Validation failed";
    return { error: String(msg) };
  }
  if (
    raw.confirmPassword !== undefined &&
    raw.password !== raw.confirmPassword
  ) {
    return { error: "Las contraseñas no coinciden" };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error:
        "Sesión de invitación inválida o expirada. Solicita una nueva invitación.",
    };
  }

  const adminSupabase = await createClient();
  const { data: adminRole, error: roleError } = await adminSupabase
    .from("user_roles")
    .select("id, is_active")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !adminRole) {
    return { error: "User does not have an admin role" };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (updateError) return { error: "Failed to update password" };

  const { error: activateError } = await adminSupabase
    .from("user_roles")
    .update({ is_active: true })
    .eq("id", adminRole.id);
  if (activateError) {
    return { error: "Password updated but failed to activate admin role" };
  }

  redirect("/dashboard/login");
}

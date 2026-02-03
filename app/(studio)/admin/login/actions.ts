"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "../utils/admin-utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function adminLogin(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error, data: authData } = await supabase.auth.signInWithPassword(
    data
  );

  if (error) {
    redirect("/admin/login?error=invalid_credentials");
  }

  // Verify that the user has admin role
  const admin = await isAdmin();
  if (!admin) {
    // Logout if not admin
    await supabase.auth.signOut();
    redirect("/admin/login?error=not_admin");
  }

  // Revalidate admin and layout routes
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  redirect("/admin/clients");
}

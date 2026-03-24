"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function adminLogin(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } =
    await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect("/dashboard/login?error=invalid_credentials");
  }

  const admin = await isAdmin();
  if (!admin) {
    await supabase.auth.signOut();
    redirect("/dashboard/login?error=not_admin");
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

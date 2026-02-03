"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/admin/utils/admin-utils";
import {
  createClientSchema,
  updateClientSchema,
} from "@/app/(studio)/admin/schemas/clients";
import type { CreateClientInput } from "@/app/(studio)/admin/schemas/clients";
import { isValidUUID } from "@/app/(studio)/admin/schemas/params";

export type ClientActionResult = { error?: string };

export async function createClientAction(
  raw: CreateClientInput
): Promise<ClientActionResult> {
  const check = await requireAdmin();
  if (!check.success) redirect("/admin/login?error=admin_required");

  const parsed = createClientSchema.safeParse(raw);
  if (!parsed.success) {
    const msg =
      Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ??
      "Validation failed";
    return { error: String(msg) };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("ca_user_id", data.ca_user_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (existingClient)
    return { error: "A client with this ca_user_id already exists" };

  const finalSlug =
    data.slug ??
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  if (finalSlug) {
    const { data: existingSlug } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", finalSlug)
      .is("deleted_at", null)
      .maybeSingle();
    if (existingSlug)
      return { error: "A client with this slug already exists" };
  }

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      ca_user_id: data.ca_user_id,
      name: data.name,
      email: data.email,
      slug: finalSlug || null,
      description: data.description ?? null,
      is_active: data.is_active,
      metadata: data.metadata ?? null,
      created_by: check.user.id,
      updated_by: check.user.id,
    })
    .select()
    .single();

  if (error) return { error: "Failed to create client" };
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${client.id}`);
}

export async function updateClientAction(
  clientId: string,
  raw: {
    name?: string;
    email?: string;
    description?: string | null;
    is_active?: boolean;
  }
): Promise<ClientActionResult> {
  const check = await requireAdmin();
  if (!check.success) redirect("/admin/login?error=admin_required");
  if (!isValidUUID(clientId)) return { error: "Invalid client ID" };

  const parsed = updateClientSchema.safeParse(raw);
  if (!parsed.success) {
    const msg =
      Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] ??
      "Validation failed";
    return { error: String(msg) };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .is("deleted_at", null)
    .single();
  if (!existing) return { error: "Client not found" };

  const updateData: Record<string, unknown> = {
    updated_by: check.user.id,
    ...parsed.data,
  };
  const { error } = await supabase
    .from("clients")
    .update(updateData)
    .eq("id", clientId);

  if (error) return { error: "Failed to update client" };
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
  return {};
}

export async function deleteClientAction(
  clientId: string
): Promise<ClientActionResult> {
  const check = await requireAdmin();
  if (!check.success) redirect("/admin/login?error=admin_required");
  if (!isValidUUID(clientId)) return { error: "Invalid client ID" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .is("deleted_at", null)
    .single();
  if (!existing) return { error: "Client not found" };

  const { error } = await supabase
    .from("clients")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: check.user.id,
    })
    .eq("id", clientId);

  if (error) return { error: "Failed to delete client" };
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
  return {};
}

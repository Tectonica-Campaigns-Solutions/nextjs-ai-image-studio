import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/admin/utils/admin-utils";
import { updateClientSchema } from "@/app/(studio)/admin/schemas/clients";
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
 * GET /api/admin/clients/[id]
 * Get a client by ID
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
    const { data: client, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return errorResponse("Client not found", 404);
      }
      return errorResponse("Failed to fetch client", 500);
    }

    return NextResponse.json({ client });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/admin/clients/[id]
 * Update a client
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
    const parsed = updateClientSchema.safeParse(body);

    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message =
        (Object.values(first)[0]?.[0] as string) ?? "Validation failed";
      return errorResponse(message, 400);
    }

    const supabase = await createClient();
    const { data: existingClient, error: fetchError } = await supabase
      .from("clients")
      .select("id, ca_user_id, slug")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !existingClient) {
      return errorResponse("Client not found", 404);
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {
      updated_by: adminCheck.user.id,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    if (data.slug !== undefined) updateData.slug = data.slug;

    if (
      data.slug !== undefined &&
      data.slug &&
      data.slug !== existingClient.slug
    ) {
      const { data: duplicate } = await supabase
        .from("clients")
        .select("id")
        .eq("slug", data.slug)
        .neq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (duplicate) {
        return errorResponse("A client with this slug already exists", 409);
      }
    }

    const { data: client, error } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return errorResponse("Failed to update client", 500);
    }

    return NextResponse.json({ client });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * DELETE /api/admin/clients/[id]
 * Soft delete a client (set deleted_at)
 */
export async function DELETE(
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
    const { data: existingClient, error: fetchError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !existingClient) {
      return errorResponse("Client not found", 404);
    }

    const { error } = await supabase
      .from("clients")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: adminCheck.user.id,
      })
      .eq("id", id);

    if (error) {
      return errorResponse("Failed to delete client", 500);
    }

    return NextResponse.json({ success: true });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

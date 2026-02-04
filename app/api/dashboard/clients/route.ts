import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { createClientSchema } from "@/app/(studio)/dashboard/schemas/clients";
import { errorResponse } from "@/app/api/dashboard/_lib/api-response";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/dashboard/clients
 * Get all clients (only admin)
 * Query params: ca_user_id (optional) to filter
 */
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) {
    return adminCheck.response;
  }

  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const caUserId = searchParams.get("ca_user_id");

    let query = supabase
      .from("clients")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (caUserId) {
      query = query.eq("ca_user_id", caUserId);
    }

    const { data: clients, error } = await query;

    if (error) {
      return errorResponse("Failed to fetch clients", 500);
    }

    return NextResponse.json({ clients: clients || [] });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/dashboard/clients
 * Create a new client (only admin)
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) {
    return adminCheck.response;
  }

  try {
    const body = await request.json();
    const parsed = createClientSchema.safeParse(body);

    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message = Object.values(first)[0]?.[0] ?? "Validation failed";
      return errorResponse(message, 400);
    }

    const data = parsed.data;
    const supabase = await createClient();

    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("ca_user_id", data.ca_user_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingClient) {
      return errorResponse("A client with this ca_user_id already exists", 409);
    }

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

      if (existingSlug) {
        return errorResponse("A client with this slug already exists", 409);
      }
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
        created_by: adminCheck.user.id,
        updated_by: adminCheck.user.id,
      })
      .select()
      .single();

    if (error) {
      return errorResponse("Failed to create client", 500);
    }

    return NextResponse.json({ client }, { status: 201 });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

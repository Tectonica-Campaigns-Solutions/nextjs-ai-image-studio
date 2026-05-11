import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import {
  createFundraisingSchema,
  updateFundraisingSchema,
} from "@/app/(studio)/dashboard/features/clients/schemas/fundraising";
import {
  errorResponse,
  validateIdParam,
} from "@/app/api/dashboard/_lib/api-response";
import { NextRequest, NextResponse } from "next/server";

async function getParams(
  params: Promise<{ id: string }>,
): Promise<{ id: string; error: null } | { id: null; error: NextResponse }> {
  const { id } = await params;
  const invalid = validateIdParam(id);
  if (invalid) return { id: null, error: invalid };
  return { id, error: null };
}

/**
 * GET /api/dashboard/clients/[id]/fundraising
 * Returns { fundraising: data | null } — null when no record exists yet.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const paramsResult = await getParams(context.params);
  if (paramsResult.error) return paramsResult.error;
  const { id } = paramsResult;

  try {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (clientError || !client) return errorResponse("Client not found", 404);

    const { data, error } = await supabaseAdmin
      .from("client_fundraising_data")
      .select("*")
      .eq("client_id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return errorResponse("Failed to fetch fundraising data", 500);

    return NextResponse.json({ fundraising: data ?? null });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/dashboard/clients/[id]/fundraising
 * Creates the fundraising data record for this client.
 * Returns 409 if a record already exists.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const paramsResult = await getParams(context.params);
  if (paramsResult.error) return paramsResult.error;
  const { id } = paramsResult;

  try {
    const body = await request.json();
    const parsed = createFundraisingSchema.safeParse(body);

    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message = Object.values(first)[0]?.[0] ?? "Validation failed";
      return errorResponse(message, 400);
    }

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, ca_user_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (clientError || !client) return errorResponse("Client not found", 404);

    const { data: existing } = await supabaseAdmin
      .from("client_fundraising_data")
      .select("id")
      .eq("client_id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      return errorResponse(
        "Fundraising data already exists for this client. Use PATCH to update.",
        409,
      );
    }

    const { data: fundraising, error } = await supabaseAdmin
      .from("client_fundraising_data")
      .insert({
        client_id: id,
        ca_user_id: client.ca_user_id,
        ...parsed.data,
        created_by: adminCheck.user.id,
        updated_by: adminCheck.user.id,
      })
      .select()
      .single();

    if (error) return errorResponse("Failed to create fundraising data", 500);

    return NextResponse.json({ fundraising }, { status: 201 });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/dashboard/clients/[id]/fundraising
 * Partially updates the fundraising data record for this client.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  const paramsResult = await getParams(context.params);
  if (paramsResult.error) return paramsResult.error;
  const { id } = paramsResult;

  try {
    const body = await request.json();
    const parsed = updateFundraisingSchema.safeParse(body);

    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message = Object.values(first)[0]?.[0] ?? "Validation failed";
      return errorResponse(message, 400);
    }

    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (clientError || !client) return errorResponse("Client not found", 404);

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("client_fundraising_data")
      .select("id")
      .eq("client_id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingError) return errorResponse("Failed to fetch fundraising data", 500);
    if (!existing) return errorResponse("Fundraising data not found for this client", 404);

    const updateData: Record<string, unknown> = {
      updated_by: adminCheck.user.id,
    };

    const data = parsed.data;
    if (data.org_name !== undefined) updateData.org_name = data.org_name;
    if (data.donation_page_url !== undefined) updateData.donation_page_url = data.donation_page_url;
    if (data.approval_required !== undefined) updateData.approval_required = data.approval_required;
    if (data.approval_turnaround !== undefined) updateData.approval_turnaround = data.approval_turnaround;
    if (data.user_role_description !== undefined) updateData.user_role_description = data.user_role_description;
    if (data.crm_access !== undefined) updateData.crm_access = data.crm_access;
    if (data.crm_tool_note !== undefined) updateData.crm_tool_note = data.crm_tool_note;
    if (data.cash_handling_process !== undefined) updateData.cash_handling_process = data.cash_handling_process;
    if (data.org_messaging_notes !== undefined) updateData.org_messaging_notes = data.org_messaging_notes;
    if (data.audience_knowledge_members !== undefined) updateData.audience_knowledge_members = data.audience_knowledge_members;
    if (data.audience_knowledge_supporters !== undefined) updateData.audience_knowledge_supporters = data.audience_knowledge_supporters;
    if (data.audience_knowledge_public !== undefined) updateData.audience_knowledge_public = data.audience_knowledge_public;

    const { data: fundraising, error } = await supabaseAdmin
      .from("client_fundraising_data")
      .update(updateData)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return errorResponse("Failed to update fundraising data", 500);

    return NextResponse.json({ fundraising });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

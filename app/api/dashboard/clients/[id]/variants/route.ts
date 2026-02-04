import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import {
  errorResponse,
  validateIdParam,
} from "@/app/api/dashboard/_lib/api-response";
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
 * GET /api/dashboard/clients/[id]/variants
 * Get the list of unique variants available for a client (only logos)
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
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (clientError || !client) {
      return errorResponse("Client not found", 404);
    }

    const { data: assets, error } = await supabase
      .from("client_assets")
      .select("variant")
      .eq("client_id", id)
      .eq("asset_type", "logo")
      .not("variant", "is", null)
      .is("deleted_at", null);

    if (error) {
      return errorResponse("Failed to fetch variants", 500);
    }

    const variants = Array.from(
      new Set(
        (assets || [])
          .map((a) => a.variant)
          .filter((v): v is string => v != null)
      )
    ).sort();

    return NextResponse.json({ variants });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { errorResponse } from "@/app/api/dashboard/_lib/api-response";

/**
 * GET /api/dashboard/plans
 * List available client plans (admin only).
 */
export async function GET(_request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck.response;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("plans")
      .select("id, code, name, images_limit")
      .is("deleted_at", null)
      .order("images_limit", { ascending: true });

    if (error) return errorResponse("Failed to fetch plans", 500);

    return NextResponse.json({ plans: data ?? [] });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

import { getCurrentUserWithRole } from "@/app/(studio)/admin/utils/admin-utils";
import { errorResponse } from "@/app/api/admin/_lib/api-response";

/**
 * GET /api/admin/check-role
 * Check if the current user is admin
 */
export async function GET() {
  try {
    const { user, isAdmin } = await getCurrentUserWithRole();
    if (!user) return errorResponse("Unauthorized", 401);
    return Response.json({ isAdmin, userId: user.id });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

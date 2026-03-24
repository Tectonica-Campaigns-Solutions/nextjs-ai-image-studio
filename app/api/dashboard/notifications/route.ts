import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { errorResponse } from "@/app/api/dashboard/_lib/api-response";

type NotificationType = "info" | "warning" | "success";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  timestamp: string;
};

/**
 * GET /api/dashboard/notifications
 * Returns lightweight operational notifications for dashboard header.
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.success) return auth.response;

    const supabase = await createClient();

    const now = new Date();
    const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      inactiveClientsRes,
      pendingAdminInvitesRes,
      recentAssetsRes,
      recentSessionsRes,
    ] = await Promise.all([
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("is_active", false)
        .is("deleted_at", null),
      supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .eq("is_active", false),
      supabase
        .from("client_assets")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgoIso)
        .is("deleted_at", null),
      supabase
        .from("client_canvas_sessions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgoIso)
        .is("deleted_at", null),
    ]);

    const notifications: NotificationItem[] = [];

    const inactiveClientsCount = inactiveClientsRes.count ?? 0;
    if (inactiveClientsCount > 0) {
      notifications.push({
        id: "inactive-clients",
        title: "Inactive clients detected",
        description: `${inactiveClientsCount} client${inactiveClientsCount === 1 ? "" : "s"} currently inactive.`,
        type: "warning",
        timestamp: now.toISOString(),
      });
    }

    const pendingAdminInvitesCount = pendingAdminInvitesRes.count ?? 0;
    if (pendingAdminInvitesCount > 0) {
      notifications.push({
        id: "pending-admin-invites",
        title: "Pending admin invitations",
        description: `${pendingAdminInvitesCount} admin invite${pendingAdminInvitesCount === 1 ? "" : "s"} pending acceptance.`,
        type: "info",
        timestamp: now.toISOString(),
      });
    }

    const recentAssetsCount = recentAssetsRes.count ?? 0;
    if (recentAssetsCount > 0) {
      notifications.push({
        id: "recent-assets",
        title: "Asset uploads in last 7 days",
        description: `${recentAssetsCount} new asset${recentAssetsCount === 1 ? "" : "s"} uploaded recently.`,
        type: "success",
        timestamp: now.toISOString(),
      });
    }

    const recentSessionsCount = recentSessionsRes.count ?? 0;
    if (recentSessionsCount > 0) {
      notifications.push({
        id: "recent-sessions",
        title: "Canvas activity in last 7 days",
        description: `${recentSessionsCount} new session${recentSessionsCount === 1 ? "" : "s"} started recently.`,
        type: "info",
        timestamp: now.toISOString(),
      });
    }

    return Response.json({
      notifications,
      generatedAt: now.toISOString(),
    });
  } catch {
    return errorResponse("Internal server error", 500);
  }
}

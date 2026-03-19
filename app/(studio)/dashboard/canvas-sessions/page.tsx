import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { StitchDashboardShell } from "@/app/(studio)/dashboard/stitch/StitchDashboardShell";
import { StitchCanvasSessionsPageScreen } from "@/app/(studio)/dashboard/stitch/StitchCanvasSessionsPageScreen";
import type { CanvasSessionSummary } from "@/app/(studio)/dashboard/types";

export default async function CanvasSessionsPage() {
  const auth = await requireAdmin();
  if (!auth.success) {
    redirect("/dashboard/login?error=admin_required");
  }

  const supabase = await createClient();
  const limit = 500;

  const [{ data, count, error }, clientsRes] = await Promise.all([
    supabase
      .from("client_canvas_sessions")
      .select(
        "id, client_id, ca_user_id, name, thumbnail_url, background_url, created_at, updated_at",
        { count: "exact" }
      )
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase.from("clients").select("id, name").is("deleted_at", null),
  ]);

  if (error || !data) {
    redirect("/dashboard/login?error=admin_required");
  }

  return (
    <StitchDashboardShell activeNav="canvas-sessions">
      <StitchCanvasSessionsPageScreen
        sessions={data as CanvasSessionSummary[]}
        totalSessions={count ?? 0}
        showingCount={data.length}
        clientNames={Object.fromEntries((clientsRes.data ?? []).map((c) => [c.id, c.name]))}
      />
    </StitchDashboardShell>
  );
}


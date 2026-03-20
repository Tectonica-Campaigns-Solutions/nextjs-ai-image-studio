"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { isValidUUID } from "@/app/(studio)/dashboard/schemas/params";
import { fetchActiveItem, type ActionResult } from "@/app/(studio)/dashboard/utils/action-utils";

export type CanvasSessionActionResult = ActionResult;

export async function deleteCanvasSessionAction(
  clientId: string,
  sessionId: string
): Promise<CanvasSessionActionResult> {
  const check = await requireAdmin();
  if (!check.success) return { error: "Unauthorized" };
  if (!isValidUUID(clientId) || !isValidUUID(sessionId))
    return { error: "Invalid ID" };

  // Uses admin client (service-role) to bypass RLS for canvas sessions
  const supabase = createAdminClient();

  const { error: itemError } = await fetchActiveItem(
    supabase,
    "client_canvas_sessions",
    sessionId,
    clientId,
  );
  if (itemError) return { error: "Session not found" };

  const { error } = await supabase
    .from("client_canvas_sessions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) return { error: "Failed to delete session" };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/app/(studio)/dashboard/utils/admin-utils";
import { isValidUUID } from "@/app/(studio)/dashboard/schemas/params";

export type CanvasSessionActionResult = { error?: string };

export async function deleteCanvasSessionAction(
  clientId: string,
  sessionId: string
): Promise<CanvasSessionActionResult> {
  const check = await requireAdmin();
  if (!check.success) return { error: "Unauthorized" };
  if (!isValidUUID(clientId) || !isValidUUID(sessionId))
    return { error: "Invalid ID" };

  const supabase = await createClient();
  const { data: session, error: fetchError } = await supabase
    .from("client_canvas_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !session) return { error: "Session not found" };

  const { error } = await supabase
    .from("client_canvas_sessions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) return { error: "Failed to delete session" };
  revalidatePath(`/dashboard/clients/${clientId}`);
  return {};
}

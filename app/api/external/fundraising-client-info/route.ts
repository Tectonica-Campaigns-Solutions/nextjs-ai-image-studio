import { NextRequest, NextResponse } from "next/server";
import { requireExternalAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/external/fundraising-client-info?client_id=<ca_user_id>
 *
 * Returns the fundraising data and basic client info for a given client.
 * `client_id` maps to the `ca_user_id` field in the clients table.
 *
 * Authentication: Bearer <EXTERNAL_API_KEY>
 */
export async function GET(request: NextRequest) {
  const authError = await requireExternalAuth(request);
  if (authError) return authError;

  const caUserId = request.nextUrl.searchParams.get("client_id");
  if (!caUserId || caUserId.trim() === "") {
    return NextResponse.json(
      { error: "Missing required query parameter: client_id" },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, email, ca_user_id, is_active")
      .eq("ca_user_id", caUserId.trim())
      .is("deleted_at", null)
      .maybeSingle();

    if (clientError) {
      console.error("[fundraising-client-info] DB error fetching client:", clientError);
      return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
    }

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 },
      );
    }

    const { data: fundraising, error: fundraisingError } = await supabase
      .from("client_fundraising_data")
      .select("*")
      .eq("client_id", client.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (fundraisingError) {
      console.error("[fundraising-client-info] DB error fetching fundraising data:", fundraisingError);
      return NextResponse.json({ error: "Failed to fetch fundraising data" }, { status: 500 });
    }

    const clientInfo = {
      client: {
        ca_user_id: client.ca_user_id,
        name: client.name,
        email: client.email,
        is_active: client.is_active,
      },
      fundraising: fundraising
        ? {
            org_name: fundraising.org_name,
            donation_page_url: fundraising.donation_page_url,
            approval_required: fundraising.approval_required,
            approval_turnaround: fundraising.approval_turnaround,
            user_role_description: fundraising.user_role_description,
            crm_access: fundraising.crm_access,
            crm_tool_note: fundraising.crm_tool_note,
            cash_handling_process: fundraising.cash_handling_process,
            org_messaging_notes: fundraising.org_messaging_notes,
            audience_knowledge_members: fundraising.audience_knowledge_members,
            audience_knowledge_supporters: fundraising.audience_knowledge_supporters,
            audience_knowledge_public: fundraising.audience_knowledge_public,
            consent_forms_url: fundraising.consent_forms_url,
            leader_experience_default: fundraising.leader_experience_default,
            story_source_rules: fundraising.story_source_rules,
            story_flag_in_brief: fundraising.story_flag_in_brief,
            strategic_goal: fundraising.strategic_goal,
            impact_statement: fundraising.impact_statement,
            relational_goal: fundraising.relational_goal,
            community_terms: fundraising.community_terms,
            tone_descriptors: fundraising.tone_descriptors,
            legal_structure: fundraising.legal_structure,
            legal_jurisdiction: fundraising.legal_jurisdiction,
            p2p_page_support: fundraising.p2p_page_support,
            email_capture_automatic: fundraising.email_capture_automatic,
            primary_outreach_channels: fundraising.primary_outreach_channels,
            social_platform_registrations: fundraising.social_platform_registrations,
            active_matching_gift: fundraising.active_matching_gift,
            active_matching_gift_details: fundraising.active_matching_gift_details,
            tactic_settings: (fundraising.tactic_settings as Record<string, unknown> | null) ?? null,
            story_requirement_by_tier: (fundraising.story_requirement_by_tier as Record<string, string> | null) ?? null,
            absolute_guardrails: (fundraising.absolute_guardrails as Array<unknown> | null) ?? null,
          }
        : null,
    };

    return NextResponse.json({ clientInfo });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

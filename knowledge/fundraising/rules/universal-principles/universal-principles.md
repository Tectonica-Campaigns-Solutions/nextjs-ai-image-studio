---
title: Universal Principles
content-type: RULE
context: all
priority: critical
brief-section: guardrails-and-reminders
---

# Universal Principles

These principles apply to every tactic and every conversation. They are not tactic-specific — they are system-level defaults that surface at appropriate moments regardless of what the leader is running.

Each principle is confirmed by the org in Section 4.4 of the customisation workbook. The workbook allows orgs to modify these defaults. If a CLIENT CONTEXT absolute_guardrails field contradicts a universal principle, the guardrail takes precedence — it represents the org's explicit override.


## Email Collection

Always confirm the leader has a way to collect or capture donor email addresses at the point of giving. Required for receipts, thank yous, and follow-up regardless of the channel used for the ask.

If email_capture_automatic is true in CLIENT CONTEXT: this principle is already confirmed and resolved — do not ask about it. Note in the brief that email capture is in place via the org's donation page.

If email_capture_automatic is false or absent: confirm the method during the diagnostic. If the leader does not have a mechanism, flag it in the brief's Guardrails and Reminders section and add email capture setup as an action item in the execution plan.


## Employer Match

Surface in thank you communications only — not in ask messaging. Employer matching programs are not available to the majority of donors; leading with this in the ask overstates its relevance.

**One-liner for thank you communications:**
> "If your employer offers charitable donation matching, your gift could go even further — worth checking."

Group-sourced matching gifts (secured by a group leader from a local donor, business, or community contact) are just as valid as org-provided matching gifts and should be surfaced and amplified in the same way.

This principle is applied automatically to every brief — do not ask the leader about it during the diagnostic.


## Follow-up Plan

Every fundraising effort must have a follow-up plan. Every brief includes a Follow-up Plan section as the final step regardless of tactic.

Follow-up covers: thanking donors, reporting back on impact, and keeping donors engaged to build long-term relationships and repeat giving.

If relational_goal is in CLIENT CONTEXT, use it to frame the follow-up plan — the relational objective (deepen belonging, recruit, re-activate, steward) shapes what the follow-up communications are designed to achieve beyond the immediate drive.

This principle is applied automatically to every brief — do not ask the leader about it during the diagnostic.


## Compelling Story

A personal, human story at the center of the ask is one of the strongest drivers of conversion across almost all tactics. Story elicitation is not optional — it happens inline during Block 4 and cannot be skipped.

See `/framework/story-elicitation/story-elicitation.md` for the full elicitation flow, including client-layer overrides for story_source_rules and story_requirement_by_tier.


## Absolute Guardrails

If absolute_guardrails are present in CLIENT CONTEXT, apply them to every piece of content generated in the conversation — scripts, posts, emails, messages, and the brief. These are the org's hard lines. Never produce output that crosses them regardless of what the leader requests.

Each guardrail has a stated reason. If the leader asks why a guardrail applies, explain the reason from the CLIENT CONTEXT if one is provided, or acknowledge that it is an org policy without elaborating further.

If a guardrail conflicts with what the leader is asking for, address it directly: "I can't include that — your org has a policy against [rule] because [reason]. Let me suggest an alternative approach."

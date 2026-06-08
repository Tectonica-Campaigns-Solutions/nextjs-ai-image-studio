---
title: Diagnostic Block 1 — Motivation and Context
content-type: LANGUAGE
context: full-diagnostic
priority: standard
brief-section: fundraising-goal-and-context
scoring-variables: target-amount, lead-time, recurring-vs-one-time, sustainability-vs-growth, org-campaign
---

# Diagnostic Block 1 — Motivation and Context

These questions establish the foundational context for the entire campaign. Every answer feeds directly into the Campaign Brief's Fundraising Goal and Context section and into the Layer 2 fit scoring.

## Pre-check: what CLIENT CONTEXT already resolves

Before asking any Block 1 question, confirm what is already known:

| Question | Skip if CLIENT CONTEXT contains |
|---|---|
| Q on approval requirements | approval_required is set |
| Q on cash handling | cash_handling_process is present |
| Q on legal / regulatory awareness | legal_jurisdiction is present — apply flags automatically |
| Q on org fundraising history with this audience | primary_outreach_channels or org_messaging_notes is present |
| Q on personal connection to the issue | Do not ask — Block 4 Step 1 covers this in context |

If strategic_goal is in CLIENT CONTEXT, use it to anchor the goal question — confirm rather than ask from scratch.

## Questions

**Q1 — Cause and purpose**
> "What are you fundraising for? Is it for a specific cause, campaign, or purpose?"

If strategic_goal is in CLIENT CONTEXT: "I can see your org's current campaign goal is [strategic_goal] — is that what you're fundraising toward, or something specific to your group?"

**Q2 — Org campaign or independent**
> "Is this part of a broader org fundraising campaign, or is your group running this independently?"

If part of org campaign:
> "Has the org already communicated with your audience about this campaign? This helps us understand whether your ask is a first touchpoint or a reinforcing one."

On approval: if approval_required is in CLIENT CONTEXT, apply it silently. If not:
> "Does your org need to approve campaign materials before they go out — messaging, promotional content, event communications? If so, how quickly can they turn approvals around?"

**Q3 — Cash donations**
> "Do you want to collect or accept cash donations as part of your fundraiser?"

If cash_handling_process is in CLIENT CONTEXT and the leader says yes:
> "Your org has a process for cash donations: [process]. That's in place — we'll include it in your plan."

If cash_handling_process is absent and the leader says yes:
> "Does your org have a process in place for handling and tracking cash donations? If not, we'll need to sort that out before you proceed."

*Note: No cash handling process → hard stop for all in-person giving tactics.*

**Q4 — Target amount**
> "Do you have a target amount or donation range in mind?"

If yes: "Is that a total campaign goal, a per-donor ask, or both?"
If no: "Do you have a sense of the giving capacity of your audience — are you thinking small grassroots donations, mid-level gifts, or a mix?"

**Q5 — Deadline**
> "Is there urgency? Is there a deadline you're working toward?"

**Q6 — Lead time**
> "How much time do you have to plan and run this fundraiser?"

*Note: Lead time shapes tactic recommendation — do not conflate deadline with lead time.*

**Q7 — Recurring or one-time**

For community practitioner and novice tiers:
> "Is this a one-off push or something you'd want to do regularly?"

For experienced and organised-but-informal tiers:
> "Are you planning to run this drive again, or is it a one-off effort?"

Sustainability vs. growth intent is inferred from the answer — ask a follow-up only if ambiguous.

**Q8 — Evergreen option** *(defer to post-recommendation — only surface for crowdfunding or merchandise)*

Do not ask this in Block 1. Surface it only after the recommendation if the tactic candidate is crowdfunding or merchandise.

**Q9 — Legal and regulatory** *(skip if legal_jurisdiction is in CLIENT CONTEXT)*

Do not ask a general legal awareness question. If legal_jurisdiction is in CLIENT CONTEXT, the model applies tactic-specific legal flags automatically in the viability check. If absent, surface tactic-specific flags in the viability check when they arise — not as a standalone Block 1 question.

**Q10 — Org fundraising history** *(skip for novice tier; fold into framing Q2 follow-up for community practitioner)*

For community practitioner tier — ask as a follow-up to framing Q2: "Has your group fundraised from this specific audience before?"

For experienced and organised-but-informal — ask if relevant: "Has your org fundraised from this audience before, and through what channels?"

If primary_outreach_channels or org_messaging_notes is in CLIENT CONTEXT, use that information silently — do not ask the leader to reconstruct org history.

**Q11 — Personal connection** *(do not ask — Block 4 covers this)*

Do not ask about personal connection to the issue in Block 1. Block 4 Step 1 (personal relevance question) surfaces this in the right context when the story is actually being developed. Asking it as a standalone Block 1 question is premature and redundant.

---
title: Light Context Check Questions — Yes Path
content-type: LANGUAGE
context: condensed-diagnostic
priority: standard
brief-section: fundraising-goal-and-context
scoring-variables: target-amount, lead-time, group-size, org-campaign
---

# Light Context Check Questions — Yes Path

These questions run at the start of the Yes path, before the viability check. They establish the minimum context needed. Skip any question where the answer is already known from CLIENT CONTEXT.

## Pre-check: what CLIENT CONTEXT already resolves

Before asking any light context check question, confirm what is already known:

| Question | Skip if CLIENT CONTEXT contains |
|---|---|
| Q4 — Does org require approval? | approval_required is set (yes or no) |
| Q5 — Email collection in place? | email_capture_automatic = true |
| Q7 — Cash donations / cash handling? | cash_handling_process is present |

If leader_experience_default is set and not "mixed" in CLIENT CONTEXT, the experience framing question has already been answered — do not ask it again.

## Questions

**Q1 — Fundraising goal**
> "What is your fundraising goal — the amount, the purpose, or both?"

**Q2 — Deadline**
> "Do you have a deadline, or is this more of an ongoing effort?"

If time-limited → standard deadline-driven campaign approach.
If evergreen → ongoing promotion model; different execution structure. Only surface the evergreen option for crowdfunding or merchandise — do not ask about evergreen for other tactics.

**Q3 — Assets snapshot**

For groups:
> "A quick snapshot of what you're working with: How many people are in your group, and how many would you say are active versus mainly sharers? And how would you describe your contact list — large and warm, or more limited?"

For solo:
> "A quick snapshot of what you're working with: How would you describe your contact list — a large warm network, or more limited? And do you have a social media presence you'd use for this?"

**Q4 — Org approval** *(skip if approval_required is in CLIENT CONTEXT)*
> "Does your org need to approve campaign materials before they go out? If so, how quickly can they turn approvals around?"

*Note: Approval lead time factors into the execution timeline.*

**Q5 — Email collection** *(skip if email_capture_automatic = true in CLIENT CONTEXT)*
> "Do you have a way to capture donor email addresses at the point of giving?"

If no → flag immediately. Email collection is a universal principle. Add setup as an action item in the brief.

**Q6 — Target amount**
> "Do you have a target amount in mind, or a sense of what your audience typically gives?"

**Q7 — Cash donations** *(skip if cash_handling_process is in CLIENT CONTEXT)*
> "Are you planning to accept cash donations as part of this?"

If yes and no CLIENT CONTEXT cash handling → does your org have a cash handling process? If no → flag immediately (hard stop for in-person tactics).

If cash_handling_process is in CLIENT CONTEXT and the leader mentions cash → tell them the process rather than asking: "Your org has a process for this: [process]. That's sorted — let's continue."

**Q8 — Deadline confirmation**
> "Just to confirm — what's your timeline from now to when you want to wrap this up?"

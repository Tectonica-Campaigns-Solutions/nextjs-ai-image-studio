---
title: Condensed Diagnostic — Blocks 2, 3, 4 (Yes Path)
content-type: LANGUAGE
context: condensed-diagnostic
priority: standard
brief-section: your-audience, execution-steps, your-story
cross-ref: language/questions/diagnostic-block2, language/questions/diagnostic-block3, language/questions/diagnostic-block4
---

# Condensed Diagnostic — Blocks 2, 3, 4 (Yes Path)

The condensed diagnostic runs after the viability check on the Yes path. It covers Block 2 fully, Block 3 partially, and Block 4 fully — skipping questions already answered during the light context check or viability check.

**Core rule: confirm, don't re-ask.** If the viability check already surfaced an answer, confirm rather than ask again.

**Client layer pre-check.** Before asking any Block 2 question, check what CLIENT CONTEXT already resolves:
- approval_required is set → skip C5 entirely; if not loaded, confirm rather than discover: "Your org requires [X] days for approvals — is that still the case for this drive?"
- active_matching_gift = true → surface match automatically as amplifier, skip C6
- active_matching_gift = false → skip org-level match question; ask about group-sourced matches only if experience flag is organised-but-informal or experienced

Opening:
> "Great — a few quick questions before we build your plan."

---

## Block 2 Condensed — Audience and Relationships

**Q1 — Audience**
> "Who are you planning to ask — your own personal network, the org's list, new contacts, or a mix?"

**Q2 — Prior giving**
> "Have any of these people donated before — to you or to the org?"

**Q3 — Ask amount**
> "What donation amount feels realistic to ask for from most of these people?"

**Q4 — Matching gift** *(gate behind experience flag)*

Skip for novice and community-practitioner tiers unless leader raises it unprompted.
Ask only for organised-but-informal and experienced tiers:
> "Do you have access to any kind of matching gift — from a donor, a business, or anyone else?"

If active_matching_gift = true in CLIENT CONTEXT: skip the question entirely; surface the match as an amplifier:
> "Your org has an active matching gift program — that's your strongest message. We'll lead everything with it."

If active_matching_gift = false in CLIENT CONTEXT: skip the org-level question; ask only:
> "Does anyone in your network — a local donor, business contact, or community member — have capacity to match what your group raises?"

**Q5 — Approval** *(skip if approval_required is in CLIENT CONTEXT)*

If CLIENT CONTEXT has approval_required: apply silently to execution timeline — do not ask.
If not loaded: confirm rather than discover:
> "Your org requires [approval_turnaround] for materials — is that still the case for this campaign?"

**Q6 — Existing giving mechanism**
> "Does your group already have any way for people to give — a membership fee, a donation jar, a QR code?"

**Q7 — Contact list**
> "Is your contact list all in one place, or spread across different lists or apps?"

Note: fragmented list → flag as data quality risk in brief's Guardrails section.

*Note: follow-up plan awareness is not asked here. The universal principle mandates a follow-up plan for every brief. The actual follow-up capacity question moves to Block 3.*

---

## Block 3 Condensed — Capacity

**For groups:**

**Q8 — Active helpers and roles**
> "Of the people in your group — who's active and what are they willing to do? Think: making asks, logistics, social media, events, follow-up."

**Q9 — In-person reach**
> "Does your group have regular in-person access to people beyond your contact list — events, meetings, gatherings?"

**Q10 — Content capacity**
> "Can your group sustain regular updates during the campaign — posts, messages, follow-ups? Or is bandwidth more limited?"

**Q11 — Follow-up capacity** *(migrated from Block 2)*
> "Who in your group has the bandwidth to manage follow-up — thank yous, a results update, donor stewardship?"

**For solo:**

**Q8 — Recruitable help**
> "Is there anyone you could bring in to help — even informally?"

**Q9 — In-person reach**
> "Do you have regular in-person access to people — events, meetings, gatherings where you could make an ask?"

**Q10 — Content capacity**
> "How much time and energy do you have for keeping the campaign active — posts, messages, follow-ups? Just you, on your own."

**Q11 — Follow-up capacity** *(migrated from Block 2)*
> "Do you have the time to manage follow-up yourself — thank yous, an impact update, staying in touch with donors? Or should we keep the follow-up plan very simple?"

---

## Block 4 Condensed — Story and Supporting Materials

### Tactic-specific framing (standalone message — wait for acknowledgement before asking first story question)

**For peer-to-peer and crowdfunding tactics:**
> "Before we build your plan, one thing that will make a real difference to how well it works: the story at the center of your ask. For peer-to-peer especially, people give because of a personal story — not because of the cause in the abstract. Let me help you find it — it usually takes just a few minutes."

**For all other tactics:**
> "Before we get into materials, I want to spend a moment on something that will make your whole plan work better — the story at the center of your ask."

After the leader acknowledges, begin the story elicitation sequence.

### Story elicitation — full sequence

Follow the complete STORY ELICITATION RULES section — identical to the full diagnostic Block 4. Steps in sequence:

**Step 1 — Personal relevance** (two separate turns):
Turn 1: "Why are you personally doing this — what is your connection to this work?"
Turn 2: "Is this something that has touched your life directly, or is it something you care deeply about even though it hasn't?"

Route based on Step 1 answer: personal connection → personal track; issues-based → issues-based track; self-evident community cause → reason-based tier.

**Steps 2–5** — follow the appropriate track. Retrieve via pull_from_fundraising_knowledge with query "story elicitation personal track" or "story elicitation issues-based track".

Includes: track-specific elicitation questions, 'why now?' prompt for chronic situations, six Ws completeness check (full stories only), org-sourced story flag, minimum threshold check, reflect back and lock.

### Supporting materials (after story confirmed or flagged)

**Q12 — Visuals**
> "Do you have photos, videos, or org visual assets you can use for this campaign?"

If crowdfunding or social media are likely for this tactic, flag proactively:
> "For [tactic], having photos or video makes a real difference — it's close to a requirement. Good that you mentioned it."

*Note: local data/facts and testimonials are no longer asked during the diagnostic. They appear as fill-in-later prompts in the Your Story section of the brief.*

### Transition to brief generation

Once Block 4 is complete and the story is confirmed or flagged, all five brief transition conditions should be met. Enter DELIVER mode and generate the Campaign Brief.

---
title: Tactic Recommendation Engine — Fit Scoring
content-type: FRAMEWORK
context: tactic-recommendation
priority: critical
brief-section: recommended-tactics
---

# Tactic Recommendation Engine — Fit Scoring

The recommendation engine runs in three layers in sequence. Each layer must complete before the next runs. Do not skip layers or run them out of order.


## Layer 0 — Client tactic settings (runs first, before any elimination)

If tactic_settings is present in CLIENT CONTEXT, apply it before any other elimination or scoring.

Prohibited: remove the tactic from all consideration immediately. Never recommend, never mention as an option, never surface in the brief — regardless of fit score or any other factor.

Discouraged: keep in the candidate pool but apply a flag when recommending. Note the downside and the org's preference to steer away unless the group has a strong specific reason. Do not lead with discouraged tactics even if they score well in later layers.

Encouraged: weight these higher in fit scoring (Layer 2). When two or more tactics score similarly, an encouraged tactic wins the tie. Surface encouraged tactics as strong fits first in the recommendation output.

Allowed (default for any tactic not listed in tactic_settings): treat as a standard candidate. No boost, no flag.

If tactic_settings is absent from CLIENT CONTEXT, skip Layer 0 and proceed directly to Layer 1.


## Layer 1 — Hard eliminators (runs after Layer 0)

A tactic eliminated here is never recommended regardless of other factors.

Solo leader → remove all G-only tactics: community events, walk-a-thon, sporting Sub-B, gala.
No regular in-person touchpoints → remove: in-person ask, house parties (unless they host), community events.
No phone numbers for contacts → remove: call banking.
No social media presence → remove: social media as primary tactic.
Org not running a giving day campaign → remove: online giving days.
No product confirmed → remove: merchandise.
No external event entry confirmed → remove: sporting Sub-A.
No prize confirmed → remove: raffles and sweepstakes.
Legal compliance for raffle or sweepstakes not confirmed → remove: raffles and sweepstakes.
No confirmed host with a warm network → remove: house parties.
No match donor identified or secured → remove: matching gift campaign from strong recommendations (can stay as worth-considering if prospect exists).
Individual pages per participant wanted → remove: crowdfunding, redirect to peer-to-peer instead.
Timeline too short for the tactic's complexity tier → remove: any Complex tier tactic with under 3 weeks, any Moderate tier tactic with under 1 week.
First-time fundraiser → deprioritise Complex tier tactics; do not recommend as a first option without explicit confidence from the leader.
If p2p_page_support is false in CLIENT CONTEXT → remove individual-page peer-to-peer; redirect to shared crowdfunding page instead.
If social_platform_registrations is in CLIENT CONTEXT → remove platform-native social media fundraiser for any platform where the org is not registered; route to campaign-to-page approach for those platforms.

Complexity tiers for reference. Simple (appropriate for first-timers): in-person ask, email appeals, SMS/WhatsApp, social media, online giving days, matching Sub-A, tribute Sub-B, sporting Sub-A. Moderate (manageable with planning): peer-to-peer, call banking, crowdfunding, local business, merchandise, matching Sub-B, tribute Sub-A recent bereavement, raffles and sweepstakes. Complex (significant overhead, benefits from prior experience): house parties, community events, walk-a-thon, sporting Sub-B, gala.


## Layer 2 — Fit scoring (runs after Layers 0 and 1)

Score remaining tactics across 13 variables. Retrieve the full scoring matrices via pull_from_fundraising_knowledge with query "tactic recommendation fit scoring" before generating a recommendation. The following rules apply in the system prompt regardless of what the scoring matrices return:

If no story exists at the point of recommendation, deprioritise all tactics until a story is developed. Surface this explicitly before presenting recommendations: "Before I point you to a tactic, I want to flag that a strong story is one of the most important factors in whether your campaign converts — and you mentioned not having one yet. Step 1 of your plan will be developing that story, and it'll make every tactic more effective. With that noted, here's what I'd recommend."

If the leader's goal is sustainability rather than growth, avoid high-effort one-off tactics and favour relationship-building tactics with repeatable structures — peer-to-peer, call banking, email appeals, house parties. Do not recommend galas, walk-a-thons, or community events as primary tactics for a sustainability goal unless the leader has run them before and has the infrastructure. This distinction is separate from recurring vs. one-time — a leader can want a one-time campaign to sustain existing capacity.

For the "community practitioner" tier: provide less scaffolding on interpersonal dynamics and more scaffolding on digital channels and technical setup. Do not talk down to them on the ask; do walk through digital mechanics more carefully.

For the "organised but informal" tier: campaign vocabulary is acceptable, standard pacing, less digital scaffolding.

Community org composite profile: when a leader's answers show a combination of sustainability focus, existing membership base or informal giving history, strong in-person presence, and community or neighbourhood orientation, apply the community org calibration. Favour in-person tactics, call banking, and relationship-based approaches. Deprioritise tactics that depend heavily on social media presence or digital list quality unless those are confirmed strong.

If primary_outreach_channels is in CLIENT CONTEXT, favour tactics that use the org's established channels. For example, if primary channels are WhatsApp and phone, call banking and SMS/WhatsApp score higher than email appeals.

If active_matching_gift is true in CLIENT CONTEXT, always surface the matching gift as an amplifier in the recommendation — it layers on top of whatever tactic is recommended, not as a replacement.


## Layer 3 — Context alignment (runs after Layer 2)

Applied after scoring, before generating the recommendation output.

If a matching gift is confirmed (from any source — org, group-recruited, or leader-secured), always surface it as an amplifier regardless of scoring.
Prior donors in the contact list boost call banking, email appeals, and peer-to-peer.
If approval_required is true and approval_turnaround is long (more than 48 hours), deprioritise time-sensitive tactics or note the timeline constraint explicitly.
Special occasion or cultural moment boosts tribute Sub-B, giving days, and social media.
Community org profile — see composite calibration rule in Layer 2.


## Recommendation output

Retrieve the recommendation output templates via pull_from_fundraising_knowledge with query "recommendation output templates" before presenting.

Present strong fits first with a 1–2 sentence rationale each referencing the leader's actual answers. Then worth-considering options with explicit tradeoffs. Recommend 1 tactic if there is an overwhelming fit, 2–3 in the typical case, no more than 3–4 if there are genuinely multiple strong fits. If too many tactics score similarly, ask 1–2 clarifying questions before recommending. Never present options that failed any layer. The brief is not a menu — it is a recommendation with rationale.

For any tactic marked Discouraged in tactic_settings: if it appears as a worth-considering option, lead its description with the flag: "Your org generally steers away from this — but given [specific fit factor], it may be worth considering if [condition]."

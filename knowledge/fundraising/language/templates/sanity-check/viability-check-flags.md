---
title: Viability Check Flag Templates
content-type: LANGUAGE
context: viability-check
priority: critical
---

# Viability Check Flag Templates

## Pre-check: CLIENT CONTEXT resolution

Before running any viability check flag, check whether the relevant condition is already resolved by the CLIENT CONTEXT. Several flags have a client-layer equivalent that removes the need to ask or flag at all.

| Flag condition | CLIENT CONTEXT field | If pre-loaded |
|---|---|---|
| Cash handling process | cash_handling_process | Tell the user the process — do not flag as a gap |
| Email capture in place | email_capture_automatic = true | Confirmed — skip email collection flag |
| P2P individual page support | p2p_page_support = false | Route to shared crowdfunding automatically — not a gap |
| Org-level matching gift | active_matching_gift | If true: surface as amplifier. If false: only ask about group-sourced match |
| Social platform registration | social_platform_registrations | Route native vs. campaign-to-page automatically per platform |
| Legal jurisdiction | legal_jurisdiction | Apply tactic-specific legal flags automatically — do not ask Block 1 legal question |

If a field is absent from CLIENT CONTEXT, apply the standard flag behaviour below.


## Standard Flag Pattern

> "Before we go further, I want to flag something. [Tactic] works best when [requirement]. Without it, [specific risk]. Do you have a plan for this?"

Three response paths after a flag:
1. **Yes / plan exists** → acknowledge and proceed
2. **No plan** → help them build one or reassess the tactic
3. **Proceed anyway** → note the flag in the brief's Guardrails and Reminders section and include a reminder in the execution plan

## Redirect Pattern (Fundamental Mismatch)

When the flag reveals a fundamental mismatch — not just a missing element but a structural incompatibility — redirect to the full diagnostic rather than patching around the problem.

Redirect framing rule: don't just block. Explain why the tactic won't work in one sentence, then offer an alternative that captures the spirit of the original idea.

> "Running a gala with two weeks and no venue isn't going to work — the logistics alone take longer than that. But the spirit of what you're after — bringing people together and making a direct ask — that's very doable. Let's look at a house party instead."

## Bot Voice Examples by Tactic

### Peer-to-Peer
> "One thing I want to flag: peer-to-peer works when you have people willing to actively ask their own networks — not just share a link. If most of your group are sharers rather than askers, the results will be limited. Do you have at least a handful of people ready to make direct asks?"

### In-Person Ask
> "Before we build this out — an in-person ask without a clear script and leave-behind tends to fall flat. People need something to hold onto after the conversation. Do you have a script and a leave-behind ready, or do you need to build those?"

### Phone / Call Banking
> "I want to make sure we set this up right. Call banking without phone numbers for your contacts is a non-starter. Do you have phone numbers for the people you're planning to call?"

### House Parties
> "House parties need a host — someone with a warm network willing to invite their own people. Without a confirmed host, this becomes a much harder lift. Do you have someone in mind?"

### Crowdfunding
> "Crowdfunding campaigns without a story or visuals rarely get traction — they need something for people to connect to and share. Do you have a story and at least some photos or video ready?"

### Email Appeals
> "I want to flag something: sending a fundraising ask from a personal email to a large list often gets caught in spam and can damage your deliverability. Do you have access to an email platform, or are you planning to send from a personal account?"

### SMS / WhatsApp
> "Before we go further — SMS and WhatsApp fundraising requires explicit opt-in from recipients. Sending to people who haven't opted in is a compliance issue. Do you have opt-in confirmation for everyone on your list?"

### Social Media
> "One thing worth flagging: social media fundraising as a standalone tactic — without a strong existing following or an engaged group to amplify — rarely generates significant donations on its own. It works best as an amplifier alongside another tactic. Is social media your primary channel, or part of a broader effort?"

### Local Business
> "I want to make sure this is set up to succeed. A local business partnership without a confirmed, written commitment before you start promoting it creates real risk — you don't want to tell your community about a match that falls through. Is the business confirmed and committed?"

### Community Events
> "Community events with in-person giving need a cash handling process in place before the day. Collecting cash without a system creates accounting and compliance problems. Does your org have a cash handling process ready?"

*Note: if cash_handling_process is in CLIENT CONTEXT, tell the user what the process is rather than asking this question.*

### Walk-a-Thon
> "Walk-a-thons work when participants are willing to fundraise — not just walk. If people are coming for the event and not the fundraising, you'll end up with a nice event and very little money raised. Are your participants ready to make asks of their own networks?"

### Sporting Sub-A (Participant fundraising)
> "For this to work, you need a confirmed event entry. Without that, the fundraising timeline and story fall apart. Is your entry confirmed?"

### Sporting Sub-B (Self-organised)
> "A self-organised sporting event needs enough volunteers to run it safely and a venue secured. Without both, the event logistics will overwhelm the fundraising. Do you have volunteers confirmed and a venue?"

### Gala
> "Galas are one of the most complex tactics to run — they require a venue, ticketing, and significant volunteer coordination. With your current timeline, I want to make sure we're building something executable, not something that runs out of time. Do you have a venue confirmed?"

### Matching Sub-A (Secured match)
> "Before we build the campaign around this match, I want to confirm the details are locked — in writing. A verbal commitment that isn't confirmed can fall through at the worst time. Is the match documented and confirmed?"

*Note: if active_matching_gift is true in CLIENT CONTEXT, the match is already confirmed — skip this flag.*

### Matching Sub-B (Unsecured match)
> "Before we build a campaign around a match you're hoping to secure — let's make sure you have a compelling case and a specific person in mind. A match donor ask is itself a fundraising conversation. Do you have someone specific, and do you know what you're going to say?"

### Tribute Sub-A — Memorial
> "Tribute campaigns for someone who has recently passed require family awareness before you go public — out of respect and to avoid causing harm. Has the family been informed and are they supportive of this tribute?"

### Tribute Sub-B — Occasion
> "For this to work, the timing needs to be right. Has the occasion date passed? And is the date confirmed so we can build the campaign around it?"

### Raffle
> "Raffles have legal compliance requirements that vary by jurisdiction. I have to be direct: we cannot proceed without confirming your raffle is legally compliant. Have you checked the rules for your location and confirmed compliance?"

*Note: if legal_jurisdiction is in CLIENT CONTEXT, the model applies the jurisdiction-specific raffle rules automatically rather than asking the leader to confirm.*

### Sweepstakes
> "Like raffles, sweepstakes have legal requirements. Before we go further, have you confirmed the rules for your jurisdiction, particularly around free entry requirements?"

*Note: same CLIENT CONTEXT jurisdiction rule applies.*

### Online Giving Days
> "Giving day campaigns work best when your org is officially participating and has assets ready — a page, a match, or amplification support. Is your org registered and running a giving day campaign that you can plug into?"

### Merchandise
> "Merchandise campaigns need a product, pricing, fulfilment sorted, and a sales mechanism before you can promote. Without these in place, you'll create demand you can't fulfil. Is your product confirmed and your fulfilment plan sorted?"

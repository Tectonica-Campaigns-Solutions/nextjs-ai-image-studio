---
doc-id: OM-01
title: Org Layer Navigation Map — Navigation and access
tags: [navigation, org-layer, where-to-find]
section: NAV
coach: org-management
content-type: NAVIGATION
layer: org
audience: org-staff, org-admin
version: 1.0
last-updated: 2026-10-09
source: "Org Layer Navigation Map (OM-01), read from the codebase"
scope: "Routes under /org/*. Excludes the group-leader layer and the super-admin panel."
retrieval-note: "Each H3 block is one self-contained retrieval unit. Paths are written as the user sees them: Nav item > Page > Section > Field, followed by the route. Text in quotes is exact UI label text."
maintenance: "When a page or label changes in the product, update the affected block here and re-ingest. Block IDs are stable and must not be renumbered."
---

# Org Layer Navigation Map — Retrieval Corpus

This corpus answers "where do I set X" with an exact path: section, then subsection, then field.

Block ID families:
- `OM-01-NAV-*` — navigation, access, landing
- `OM-01-PG-*` — main pages
- `OM-01-CT-*` — Content library
- `OM-01-ST-*` — Settings pages
- `OM-01-TI-*` — task index (vague request → exact place)
- `OM-01-VOC-*` — vocabulary and synonyms

---

## NAV — Navigation and access

### OM-01-NAV-01 · The org left navigation rail
tags: navigation, rail, menu, org-layer, orientation
route: /org/*
asked-as: "what's in the menu", "I can't find the page", "what are these sections", "where is everything"

The org layer has a flat left rail with nine items and no sub-items. Pages are divided further by in-page tabs, chips and drawers. On mobile the rail collapses into a dropdown whose header reads "Organization".

- **Today** — /org/today-cd — daily command centre: briefing, recommended actions, your to-dos, org feed.
- **Groups** — /org/glance — every group with health status, leader and measures; create groups.
- **Leaders** — /org/leaders — leader pipeline and roster, from first conversation to standing leader.
- **Send** — /org/send — direct and group messages with leaders.
- **Work** — /org/work — assignments, objectives and task sets for groups; your own tasks.
- **Numbers** — /org/reports — org-wide roll-up figures by period; CSV export.
- **eCoaches** — /org/ecoaches — gallery of AI coaches and tools; past sessions.
- **Content** — /org/content — material the org publishes to leaders: briefing cards, journeys, announcements, events, media, video updates.
- **Settings** — /org/settings — org configuration: goals and standards, approvals, operations, profile.
- **Portfolio** — /service — Tectonica support staff only, caption "Support staff only": the orgs assigned to you. Not a numbered rail item.

### OM-01-NAV-02 · Who sees the org layer
tags: access, permissions, roles, redirect
route: /org/*
asked-as: "why can't my colleague see this", "who has access", "I got redirected"

Org staff of the active organization see the org layer: org admins, plus Tectonica service staff with that org selected. Pages do not distinguish org admin from org staff. Non-staff who open an org URL are redirected to `/` — Send redirects to /messages, eCoaches to /ecoaches.

### OM-01-NAV-03 · Where you land after login
tags: login, landing, onboarding, first-run
asked-as: "why does it open on Groups", "where do I start"

After login you land on **Today** if the org has at least one group. Otherwise you land on **Groups**, which shows the "Create your first group" onboarding.

### OM-01-NAV-04 · Second rail section for group admins
tags: navigation, group-layer, dual-role
asked-as: "what is this second menu", "Manage group section"

If you are also the group admin of your active group, a section "Manage group — &lt;group name&gt;" appears below the org rail. It has the items Group settings, Goals, Action Kit and People with access. That is the group layer, not the org layer, and it is out of scope for this map.

### OM-01-NAV-05 · Pages with no rail item
tags: navigation, hidden-pages
asked-as: "it's not in the menu", "where is integrations"

Three org pages exist without a rail item:
- **Integrations** — /org/integrations — connect NationBuilder.
- **Media assets** — /org/media — a legacy duplicate of Content &gt; Shared media.
- **Profile** — /profile.

### OM-01-VOC-01 · Vocabulary and synonyms
tags: vocabulary, synonyms, naming, disambiguation
asked-as: "badge", "glance", "dashboard", "members page", "report"

Terms staff use and the label they map to in the product:
- "badge" → **credential** (Credential approvals, Credential ladder, credential standing).
- "glance" → the **Groups** page, route /org/glance. The thresholds behind its statuses are called "Glance thresholds".
- "dashboard", "home", "command centre" → **Today**, /org/today-cd.
- "reports", "stats", "metrics" → **Numbers**, /org/reports.
- "rungs" → the individual credentials in the **Credential ladder**.
- "point of contact" → the staff member who owns a leader relationship; it drives the "My groups" filter on Groups.
- "announcement" is ambiguous: the **feed post** is composed in Today &gt; "What's happening"; the **recorded video** is Today &gt; "Record today's announcement", which is the Video updates recorder.
- "Media assets" (/org/media) is a legacy duplicate of Content &gt; Shared media (/org/content/media).

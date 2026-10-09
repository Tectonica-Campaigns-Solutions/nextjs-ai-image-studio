---
doc-id: OM-01
title: Org Layer Navigation Map — Settings
tags: [navigation, org-layer, where-to-find]
section: ST
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

## ST — Settings

### OM-01-ST-01 · Settings overview and edit permissions
tags: settings, overview, permissions, groups-of-settings
path: Settings
route: /org/settings
asked-as: "where are the settings", "insufficient permissions", "I can't save"

Settings (/org/settings, heading "Settings") has 24 pages in 6 groups: Organization; Goals & standards; Approvals & queues; Operational; Leader communications; Leader experience preview. Every page has a "Settings" back link. **Integrations** (/org/integrations) is a tab next to Settings, not a card.

Edit permissions: on Fundraising, only org admins can save; support staff can view but get "Insufficient permissions". The same is assumed for the other pages until verified.

### OM-01-ST-02 · Administrators
tags: settings, organization, administrators, invite, permissions
path: Settings &gt; Organization &gt; Administrators
route: /org/settings/administrators
asked-as: "add another admin", "resend an admin invitation", "remove an admin"

- **Invite** — enter an email in **"Invite administrator"**, then click **Send invitation**.
- **Pending invitations** — **Resend** or **Revoke**.

Caveat: admins can change every org setting.

### OM-01-ST-03 · Identity
tags: settings, organization, branding, logo, name, signup-page, data-export
path: Settings &gt; Organization &gt; Identity
route: /org/settings/identity
asked-as: "change our name or logo", "privacy policy link", "export signups"

- **Brand** — **Organization name**, required, max 120 characters; **Logo** with Upload, Replace (crop) or Remove, where a square image works best. Both appear in the top bar for everyone in the org.
- **Public signup pages** — **Organization website** and **Privacy policy** URLs, then click **Save links**. They show on every group's public signup page; blank hides them.
- **Data export** — **"Download org-consent signups (CSV)"**, listing public-page signups who agreed to org contact.

Caveat: the export contains personal data.

### OM-01-ST-04 · Support access
tags: settings, organization, support, tectonica, read-only
path: Settings &gt; Organization &gt; Support access
route: /org/settings/support-access
asked-as: "who from support can see our data", "revoke support access"

A read-only list of Organizing Center Support staff with access to the org.

Caveat: the org cannot grant or revoke access here; platform administrators do.

### OM-01-ST-05 · Member recruitment
tags: settings, goals, recruitment, members, target, flags
path: Settings &gt; Goals & standards &gt; Member recruitment
route: /org/settings/member-goal
asked-as: "set our recruitment goal", "member target", "progress toward goal"

- **Fields** — **Organization goal**, a whole number, optional; and **Deadline**, optional. Then click **Save goal**.
- **Progress** — shows "n of goal active members (%)" with a per-group breakdown.

Caveat: the same goal feeds the "far from goal" flag configured in Glance thresholds.

### OM-01-ST-06 · Fundraising target
tags: settings, goals, fundraising, currency, targets, usd, gbp
path: Settings &gt; Goals & standards &gt; Fundraising target
route: /org/settings/fundraising
asked-as: "set up my fundraising target", "change our currency", "leaders see the wrong target", "monthly target"

- **Base currency** — "USD — US Dollar" or "GBP — British Pound". It is the default for **new** groups; existing groups keep theirs.
- **One card per currency** — "Monthly fundraising target — USD" and "— GBP". Each has **Monthly fundraising target** and **Target date**.
- **Save** — **Save fundraising targets** saves everything.
- **What leaders see** — a group's target is the org target for **its currency**, plus an optional group-level "Additional group target". It is read-only for leaders.

Caveats: choose the currency first, and set the target in the card matching your groups' currency. Currencies are independent and never converted. A blank amount means no target for that currency. Changing the base currency does not change existing groups — a group's currency is changed in Groups &gt; group &gt; Edit details &gt; Group currency.

### OM-01-ST-07 · Group lifecycle
tags: settings, goals, group-lifecycle, suspend, delete, rename
path: Settings &gt; Goals & standards &gt; Group lifecycle
route: /org/settings/group-lifecycle
asked-as: "pause a group", "delete a group", "reactivate a group", "rename a group"

- **Per-group menu** — rename, **Suspend group**, **Reactivate group**, **Delete permanently…**.
- Also **Create group** and **Open Groups**.

Caveats: suspend is reversible — leaders lose access, data is kept. Delete is irreversible and requires typing the group name to confirm.

### OM-01-ST-08 · Leader standards
tags: settings, goals, guidance, read-only
path: Settings &gt; Goals & standards &gt; Leader standards
route: /org/settings/lifecycle-standards
asked-as: "what's our policy on ending a group", "guidance on reassigning leadership"

Read-only written guidance on pausing a group, ending a group, reassigning leadership and public signup pages.

Caveat: nothing is configurable here.

### OM-01-ST-09 · Leader progression
tags: settings, goals, progression, track, stages
path: Settings &gt; Goals & standards &gt; Leader progression
route: /org/settings/leader-progression
asked-as: "leader development track", "what stage are leaders in"

- **Track** — the **Leader progression track** select, then **Save track**. It sets the Stage 4 sequence leaders see.
- **Groups** — read-only progress per group across the four stages.

Caveat: keep "Default" unless a custom track exists for the org.

### OM-01-ST-10 · Public sign-off
tags: settings, approvals, signup-page, approval-required
path: Settings &gt; Approvals & queues &gt; Public sign-off
route: /org/settings/sign-off-settings
asked-as: "leaders' public pages need my approval", "require approval before publishing"

- **Setting** — checkbox **"Group public signup page"**. When on, leaders must request approval before their public page goes live.
- **Saving** — auto-saves.
- Requests land in the Sign-off queue.

### OM-01-ST-11 · Sign-off queue
tags: settings, approvals, queue, approve, decline
path: Settings &gt; Approvals & queues &gt; Sign-off queue
route: /org/settings/sign-off-queue
asked-as: "approve a public page", "decline a request", "pending sign-offs"

Each request carries **Approve & publish**, or **Decline** with a "Reason for declining", max 500 characters.

Caveats: approving publishes immediately. Declining notifies and emails the leader with your reason.

### OM-01-ST-12 · Credential approvals
tags: settings, approvals, credential, badge, queue, auto-grant
path: Settings &gt; Approvals & queues &gt; Credential approvals
route: /org/settings/badge-queue
asked-as: "approve a badge", "credential requests", "a leader got a badge I didn't approve"

Pending leader credential requests carry **Approve**, or **Decline** with an optional reason. The same requests also appear on Today and at the top of Groups.

Caveat: requests **auto-grant** when the approval window ends. Ignoring a request grants it. The window is set in the Credential ladder page.

### OM-01-ST-13 · Credential ladder
tags: settings, approvals, credential, badge, rungs, window, criteria
path: Settings &gt; Approvals & queues &gt; Credential ladder
route: /org/settings/badge-definitions
asked-as: "change the credential names or order", "turn off a badge", "change the auto-approve window"

The credentials (rungs) leaders earn as their group grows, in the order they see them.
- **Rungs** — per rung: **Label** (required), description, Move up/down, On/Off. Each rung shows read-only "Earned when" criteria and its approval mode: granted by hand, automatic, or waits for staff approval. Save with **Save ladder**.
- **Approval window** — **Auto-approve after**, in hours, range 1–720, default 168 (7 days). Presets: 1, 3, 7, 14 days. Save with **Save window**.

Caveats: ladder and window save separately. Criteria are set by Organizing Center Support, not here. Switching a rung off makes leaders skip it and withdraws its pending requests.

### OM-01-ST-14 · Glance thresholds
tags: settings, operational, thresholds, status, quiet, stalled, far-from-goal, stale
path: Settings &gt; Operational &gt; Glance thresholds
route: /org/settings/operational-settings
asked-as: "why is this group marked Quiet", "why is this group Stalled", "far from goal flag", "stop reminding me to contact people"

The numbers that decide when the platform flags a prospect, leader or group.
- **Pipeline & outreach** — **Pipeline goes stale after**, in days, default 14; **Remind to contact after**, in days, default 30.
- **Recruitment goal divergence** — a group is flagged "far from goal" when it has at least the minimum number of members still to recruit and its progress is at or below the maximum. **Minimum goal to flag**, default 5; **Maximum progress to flag**, a percentage, default 25.
- **Save** — **Save thresholds**.

Caveat: this applies org-wide. It drives the statuses on Groups and on leader dashboards.

### OM-01-ST-15 · Briefing reminders
tags: settings, operational, reminders, notifications, personal
path: Settings &gt; Operational &gt; Briefing reminders
route: /org/settings/briefing-reminders
asked-as: "turn off reminders", "remind me to check Today"

Daily, Weekly or Off reminders to check Today. These are in-app, not email. The setting auto-saves.

Caveat: despite the card text, it only affects **your own** reminders, not leaders'.

### OM-01-ST-16 · Suggested to-dos
tags: settings, operational, to-dos, starter-tasks, lists, leaders
path: Settings &gt; Operational &gt; Suggested to-dos
route: /org/settings/suggested-todos
asked-as: "starter tasks for leaders", "tasks from your organization", "leaders can't see the tasks I made"

Starter tasks shown on leaders' To-Do page, in lists marked "FROM your organization".
- **Add list** — **List name**; **Visibility**: Everyone, for a time / Everyone, always / Custom; **Duration**.
- **Add task** — **Title**; Notes; **List**; Priority; **Due days after signup**; Link.

Caveats: create a list before adding tasks. Unassigned tasks are invisible to leaders. Deleting a list unassigns its tasks.

### OM-01-ST-17 · Contact stage defaults
tags: settings, operational, pipeline, stages, next-step, overrides
path: Settings &gt; Operational &gt; Contact stage defaults
route: /org/settings/contact-stage-defaults
asked-as: "change the suggested next step", "override the default task for a stage"

Overrides the platform's recommended next-step task for each pipeline stage.
- **Add an override** — per stage, click **Add override**, fill Title, Priority and Notes, then **Add org default**.
- **Remove override** — returns that stage to the platform default.

### OM-01-ST-18 · Welcome agreement
tags: settings, leader-communications, onboarding, agreement, commitments, contact
path: Settings &gt; Leader communications &gt; Welcome agreement
route: /org/settings/welcome-agreement
asked-as: "customize what new leaders agree to", "what leaders commit to", "default contact for leaders"

The agreement new leaders review right after accepting their invite.
- **Fields** — **Headline**, max 80 characters; **Introduction**, max 600; **What the leader takes on**, up to 8 commitments; **Materials you promise**; **Default named contact**, shown to leaders with no assigned point of contact.
- **Buttons** — **Save agreement** or **Restore default**. A live preview is shown.

Caveats: leaders who already agreed keep their copy. The credential, sign-off and privacy parts are automatic or fixed.

### OM-01-ST-19 · Onboarding videos
tags: settings, leader-communications, onboarding, videos, library
path: Settings &gt; Leader communications &gt; Onboarding videos
route: /org/settings/onboarding-videos
asked-as: "videos new leaders watch first", "add an onboarding video", "subtitles for onboarding videos"

Up to 6 videos new leaders watch, or read as text, after the agreement and before group setup.
- **Fields** — optional introduction, then **Upload videos** or **Add** from "Your video library". Reorder, then **Save onboarding videos**.

Caveats: with no videos, the step is skipped. Uploads also go to Content &gt; Shared media, where subtitles and readable text are edited. A video is not live until it is added to the list and saved.

### OM-01-ST-20 · Leader update
tags: settings, leader-communications, in-app, message, replies
path: Settings &gt; Leader communications &gt; Leader update
route: /org/settings/leader-update
asked-as: "send an in-app message to leaders", "message leaders can reply to"

An in-app message to all or selected leaders, posted in Leaders chat where they can reply.

### OM-01-ST-21 · Email to leaders
tags: settings, leader-communications, email, broadcast, unsubscribe
path: Settings &gt; Leader communications &gt; Email to leaders
route: /org/settings/broadcast-email
asked-as: "email all leaders", "send a newsletter", "some leaders didn't get the email"

A real email to all or selected leaders, with Subject and body.

Caveat: leaders who unsubscribed from this email type will not receive it.

### OM-01-ST-22 · Urgent message
tags: settings, leader-communications, urgent, one-way, irreversible
path: Settings &gt; Leader communications &gt; Urgent message
route: /org/settings/urgent-message
asked-as: "send something urgent to everyone", "emergency notice to leaders"

A one-way notification to **every** group leader, max 400 characters. Confirm with **Send now**.

Caveat: it cannot be undone and leaders cannot reply.

### OM-01-ST-23 · Leader experience preview
tags: settings, preview, simulation, onboarding, tour, briefing-cards
path: Settings &gt; Leader experience preview
route: /org/settings/onboarding-preview, /org/settings/tour-preview, /org/settings/briefing-preview
asked-as: "see what a new leader experiences", "test the onboarding", "which cards will a leader get"

Three simulations that change no real data:
- **Onboarding preview** — /org/settings/onboarding-preview — click through a new leader's full onboarding.
- **Platform tour preview** — /org/settings/tour-preview — the guided tour and helper suggestions.
- **Briefing cards preview** — /org/settings/briefing-preview — which briefing cards a leader gets, day by day.

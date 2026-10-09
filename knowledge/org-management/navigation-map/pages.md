---
doc-id: OM-01
title: Org Layer Navigation Map — Main pages
tags: [navigation, org-layer, where-to-find]
section: PG
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

## PG — Main pages

### OM-01-PG-TODAY-01 · Today
tags: today, briefing, to-dos, feed, flags, daily
path: Today
route: /org/today-cd
asked-as: "what do I need to do today", "I'm lost", "where is my briefing", "where are my pending approvals"

The heading is a greeting with today's date. Top-right button: **"Record today's announcement"**, which opens a drawer.

Sections:
- **"Today's briefing"** — a narrative paragraph and figures, plus flag cards with actions. Credential flags carry **Approve** and **Decline**. Contact flags carry **Reach out**, which opens Log contact.
- **"Recommended today"** — suggested actions. Each row has **Add task**, **Reach out**, or Approve/Decline. "View all" expands the list.
- **"Your to-dos"** — tasks due in the next few days. "View all" opens **Work**.
- **"What's happening"** — the org feed. Org admins can post announcements from here. This is the only place feed announcements are created.

### OM-01-PG-TODAY-02 · Today's announcement drawer
tags: today, video, recording, announcement, targeting
path: Today &gt; Record today's announcement
route: /org/today-cd
asked-as: "record a message for my leaders", "video announcement", "talking points"

Opened by the **"Record today's announcement"** button. It uses the same recorder as Content &gt; Video updates.
- **Talking points** — AI-generated.
- **"Who sees this"** — "All leaders in the organization", "Specific groups" or "One leader".
- **Start recording** — opens the recorder. The on-screen guidance is "Keep it under two minutes."

### OM-01-PG-TODAY-03 · New task drawer
tags: today, tasks, work
path: Today &gt; New task
route: /org/today-cd
asked-as: "add a task", "remind myself to do something"

Fields: What, Priority, due date, time spent, **Assignee** (defaults to you), About leader, Notes, Link, List. The task goes to **Work**.

### OM-01-PG-GROUPS-01 · Groups
tags: groups, glance, status, health, filters, create-group
path: Groups
route: /org/glance
asked-as: "list of groups", "which groups are quiet", "create a group", "group health"

Heading: "Groups". It lists every group, most recently active first. The button **"Add a group"** goes to /org/groups/new, which creates a group and emails an invite to its administrator.

- **No groups yet** — a 3-step guide (Create a group → Invite an administrator → They accept) and a **"Create group"** button.
- **Pending credential requests** — shown in a strip at the top with **Approve** and **Decline**.
- **Pattern chips** — All, Most active, Growing fastest, Gone quiet, Approaching a milestone.
- **Filters** — search box "Search by group or leader…"; toggle **"My groups"**, which shows only groups whose leader has you as point of contact.
- **Table columns** — Group; **Status** (Active, Quiet or Stalled, computed from the glance thresholds); Leader; Badges; Members (Total and 30-day); Funds raised; Hours volunteered; New sign-ups.

Caveat: group Status is not set by hand. It is computed from Settings &gt; Operational &gt; Glance thresholds, which apply org-wide.

### OM-01-PG-GROUPS-02 · Group record
tags: groups, group-record, measures, reassign, contact-history
path: Groups &gt; &lt;group name&gt;
route: /org/groups/&lt;id&gt;
asked-as: "open a group", "reassign a group to another leader", "log a contact", "group trends"

Opened by clicking a group name.
- **Header** — "Led by &lt;leader&gt;", with buttons **Message leader** and **Edit details**.
- **Panels** — "Group measures" with a measure-period selector; "What we've provided"; "Leadership", where you select **Reassign to** and then click **Reassign**; "Open staff tasks about this group"; "Leader reflections"; health signals; contact history with **Log contact**; six-month trends; membership.

### OM-01-PG-GROUPS-03 · Edit details and group lifecycle actions
tags: groups, currency, rename, pause, archive, lifecycle
path: Groups &gt; &lt;group&gt; &gt; Edit details
route: /org/groups/&lt;id&gt;
asked-as: "a group has the wrong currency", "change a group name", "pause a group"

The **Edit details** drawer holds **Group name**, description, and **Group currency** — the group's fundraising currency. Group lifecycle actions available on the record: pause, archive, reactivate.

Caveat: the base currency in Settings &gt; Fundraising target only applies to new groups. An existing group's currency is changed here.

### OM-01-PG-LEADERS-01 · Leaders
tags: leaders, pipeline, roster, stages, search
path: Leaders
route: /org/leaders
asked-as: "list of leaders", "who is in the pipeline", "find a leader", "ask about my leaders"

Heading: "Leaders". It shows everyone in the pipeline, from first conversation to standing leader. Buttons: **Import CSV** and **Add a leader**.
- **Stage chips** — All, Prospective, Interested, Invited, In conversation, Approved, Active, Paused, Ended.
- **Search, sort and ask** — search box "Search by name or group…"; **Sort by** Last contact, Alphabetical or Stage; AI pill **"Ask about your leaders…"**, which opens the corps coach.
- **Table columns** — Leader, Status, Pipeline status, Last contact, Group, Point of contact, Badges.

### OM-01-PG-LEADERS-02 · Pipeline tools
tags: leaders, pipeline, recruitment, interest-link, orientation, qr
path: Leaders &gt; Pipeline tools
route: /org/leaders
asked-as: "volunteer interest link", "orientation QR code", "who hasn't accepted their invite", "incomplete onboarding"

The **"Pipeline tools"** button opens five tools:
- **Prospective leaders** — approve new interest and move people toward an invite.
- **Public interest link** — the link volunteers use to raise their hand.
- **Orientation access** — a time-limited link and QR code for a live session.
- **Invited, not finished** — invites not yet accepted.
- **Incomplete onboarding** — leaders still in group setup.

### OM-01-PG-LEADERS-03 · Add, invite and import leaders
tags: leaders, add, invite, import, csv, email-sending
path: Leaders &gt; Add a leader / Invite / Import CSV
route: /org/leaders
asked-as: "add a new leader", "invite someone", "import a list of prospects", "will they get an email"

Three drawers:
- **"Add a leader"** — Full name (required), Email, Phone, stage, Notes. No email is sent at this step.
- **"Invite &lt;name&gt;"** — Email (required), Group name (optional; blank creates "Untitled group"). This creates a new group and sends the group leader invitation.
- **"Import prospective leaders"** — upload a CSV, or paste a list. People start at Identified, and no emails are sent.

Caveat: adding and importing send nothing. Inviting both creates a group and sends the email.

### OM-01-PG-LEADERS-04 · Leader record
tags: leaders, leader-record, point-of-contact, credential, notes, welcome-agreement
path: Leaders &gt; &lt;leader name&gt;
route: /org/leaders/&lt;id&gt;
asked-as: "who is the point of contact", "log a meeting with a leader", "pause a leader's credential", "what moves this leader"

- **Header buttons** — **"I contacted them today"**, **Send a message**, **Edit details**.
- **Figures** — Last contact, Contacts on file, Last signed in, Point of contact.
- **Panels** — "What moves them"; "Credential standing", where a credential can be paused or reactivated; "Welcome agreement" showing credential named, named contact, preferred contact and affirmations; "Suggested recognition"; "Notes and communications" with **Add a note** and **Log a meeting**; nudge history; self-reports and member feedback; open staff tasks.
- **Edit details drawer** — **Point of contact** (the staff member who owns the relationship), Groups, what moves them, how they like to be reached.

### OM-01-PG-SEND-01 · Send
tags: send, messages, conversations, inbox, attachments, voice
path: Send
route: /org/send
asked-as: "message a leader", "start a group conversation", "attach a file to a message", "help me draft a reply"

Heading: "Send". Use it to message leaders across your organization.
- **Conversation list** — with "Search conversations…".
- **New message** — click **New message**, pick one or more leaders, then click **Start conversation**. With more than one leader you can set an optional "Group title".
- **Thread actions** — attach photos, notes, or media from "Your uploads" or "From your organization"; record voice.
- **Inbox eCoach panel** on the right side — ask about unread threads or get help drafting a reply.

### OM-01-PG-WORK-01 · Work
tags: work, assignments, objectives, tasks, plans
path: Work
route: /org/work
asked-as: "give groups something to do", "review a submitted plan", "my own tasks"

Heading: "Work". Use it to assign work to your groups and keep your own tasks moving. Sections from top to bottom: the Assignment eCoach banner, "Plans to review", "Assignments", "Objectives & task sets", "My work".

The **Assignment eCoach banner** offers "Write a new assignment", "Browse templates" (opens /org/work/templates) and "Rework one nobody's taken".

**"Plans to review"** only appears when a group submits a plan, and carries the **Review plan** action.

### OM-01-PG-WORK-02 · Assignments
tags: work, assignments, publish, offer, autonomy, visibility
path: Work &gt; Assignments
route: /org/work
asked-as: "create an assignment", "groups can't see my assignment", "assignment fields"

- Button **New assignment**.
- Filter chips: All, Drafts, Not offered, Offered, Accepted, Finished.
- Card actions: **Publish** and **Offer to groups**.
- Assignment form fields: Autonomy, The ask (required), Why now (required), Boundaries, Goal, Due date, Claim limit / Group cap, Seed tasks, Source documents, success criteria, guardrails.

Caveat: an assignment is not visible to groups until it is both **published** and **offered to groups**.

### OM-01-PG-WORK-03 · Objectives and task sets
tags: work, objectives, task-sets, plan-approval
path: Work &gt; Objectives & task sets
route: /org/work
asked-as: "create an objective", "approve a group's plan", "return a plan for edits"

- Menu: **Objective** or **Task set**.
- Filter chips: All, Open, Taken, Nobody's taken it, Finished, Drafts.
- Card action: **Offer to a group**.
- On an objective, submitted plans are handled with **Approve plan** or **Return for edits**.

### OM-01-PG-WORK-04 · My work
tags: work, personal-tasks, lists, templates
path: Work &gt; My work
route: /org/work
asked-as: "my task list", "make a task template", "tasks from the organization"

- Buttons **New list** and **New task**.
- Filter chips: Due today, High priority, Hide completed, Mine, Unassigned, From Organizing Center.
- Lists can be cloned, saved as a template or deleted.

### OM-01-PG-NUM-01 · Numbers
tags: numbers, reports, roll-up, export, csv, funds
path: Numbers
route: /org/reports
asked-as: "where are our numbers", "export a report", "funds raised is empty"

Heading: "Numbers", an org roll-up.
- **Period chips** — Last 30 days (default), Last 90 days, Year to date, All time.
- **Figures** — Groups active, Leaders credentialed, Members engaged, Funds raised.
- **Export** — button **Export CSV**.

Caveat: Funds raised only populates when the NationBuilder integration is connected at /org/integrations.

### OM-01-PG-COACH-01 · eCoaches
tags: ecoaches, tools, sessions, consent
path: eCoaches
route: /org/ecoaches
asked-as: "where are the coaches", "find a past session", "graphic tool"

Heading: "eCoaches". Pick a tool, or ask a coach to do work for your organization.
- **"Search past sessions"**.
- **"Your favorite eCoaches"**.
- **Coaches by category** — opening a coach goes to /org/ecoach/&lt;coach&gt;, which shows its history and new chats.

Caveat: the graphic-creation tool asks for a one-time consent first.

### OM-01-PG-INT-01 · Integrations
tags: integrations, nationbuilder, external-systems
path: Integrations
route: /org/integrations
asked-as: "connect NationBuilder", "sync our CRM", "integrations page"

Heading: "Integrations". Connect external systems; NationBuilder is the provider available today. It has no rail item and is reached from Settings and from feed links.

### OM-01-PG-PORT-01 · Portfolio
tags: portfolio, support-staff, switch-org, tectonica
path: Portfolio
route: /service
audience: tectonica-support-staff
asked-as: "switch organization", "my assigned orgs"

Tectonica support staff only. Lists the organizations assigned to you. Use **Open organization** or **Switch to organization** to change the active org.

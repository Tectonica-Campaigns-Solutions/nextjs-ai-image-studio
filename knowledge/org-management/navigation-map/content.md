---
doc-id: OM-01
title: Org Layer Navigation Map — Content
tags: [navigation, org-layer, where-to-find]
section: CT
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

## CT — Content

### OM-01-CT-00 · Content library overview
tags: content, library, publishing, targeting, where-it-appears
path: Content
route: /org/content
asked-as: "what can I publish to leaders", "where does this show up for leaders", "can I target one group"

Content (/org/content, heading "Content", list header "Library") holds the six kinds of material the org publishes to its leaders. Everything here reaches every group in the org, with two exceptions: Shared media and Video updates can be targeted.

- **Briefing cards** — /org/content/briefing-cards — appear in the home briefing deck (card stack on the leader's home). Targeted per member (signup day, active days, events), not per group. Draft / Published.
- **Journeys** — /org/content/journeys — an ordered series of briefing cards on the home deck. Same targeting as briefing cards. Draft state follows each card.
- **Announcements** — /org/content/announcements — appear in the home feed "What's happening" of every group. All groups. Live immediately.
- **Organization events** — /org/content/events — appear in the feeds and calendars of every group. All groups. Live immediately.
- **Shared media** — /org/content/media — appear in each group's "Media & Assets". All groups or specific groups. Live immediately.
- **Video updates** — /org/content/video-updates — appear in the leader's inbox, in Explore "Video updates" and as a home card. All leaders, specific groups, or one leader. Sent immediately.

### OM-01-CT-01 · Briefing cards — creating and managing
tags: content, briefing-cards, home-stack, draft, reorder, preview
path: Content &gt; Briefing cards
route: /org/content/briefing-cards
asked-as: "put something on leaders' home screen", "reorder cards", "preview what leaders see"

- **Create** — click **New card**, fill the form, then click **Save as draft** or **Publish card**.
- **Manage** — filter by category and status; drag to reorder; use **Preview** to see the leader view. Row actions: Edit, Publish/Unpublish, Duplicate, Delete.

Caveats: reordering is blocked while a filter is on, so clear filters first. Drafts are invisible to leaders. Deleting removes the card from every home briefing and cannot be undone. "Feed"-only placement keeps the card off the home stack.

### OM-01-CT-02 · Briefing cards — form fields
tags: content, briefing-cards, fields, trigger, window, audience, buttons, media-limits
path: Content &gt; Briefing cards &gt; New card
route: /org/content/briefing-cards
asked-as: "briefing card options", "schedule a card", "show a card on the first day", "add a button to a card"

- **Title** — required, max 200 characters.
- **Body** — required, max 5,000 characters.
- **Media** — None, Image, or Video. Images are JPEG/PNG/WebP/GIF up to 10 MB. Videos come from the platform library, the org library or your group, or are uploaded as MP4/WebM up to 200 MB. Optional "Read as text" and subtitles (.vtt or .srt).
- **Content type** — pre-fills trigger, window and placement. Options: Announcement, Tutorial video, Loom, Tip, To-do, Check-in, Settings question, Milestone.
- **Recipe** — one-step patterns: "First day only", "First 7 days", "Everyone, always", "After completing another card", "Welcome back", "Custom".
- **Trigger** — pick exactly one: Always; On a date; A specific day (Signup day or Active day clock); When the user does something (a platform event); After other cards (a sequence).
- **Window** — Duration: 24 hours, 72 hours, 1 week, 1 month, Until done, Always. Anchor: From publish, or From trigger.
- **Display & ranking** — Category: Platform how-to, AI literacy, Organizing, Campaign, Purpose, Org comms, Tips, Case study. Placement: Home stack, Feed, Both. Priority: Pinned, High, Normal, Low.
- **Sequence** — assign the card to a journey, or create one inline. **Skippable** controls whether "Not interested" unlocks the next card.
- **Advanced — audience** — signup-day range, active-days range, absence filter, days since last active.
- **Buttons** — up to 3. Each has a label, an icon, and a URL, either an app path such as /members or an https link.

### OM-01-CT-03 · Journeys
tags: content, journeys, onboarding, sequence, pacing, funnel
path: Content &gt; Journeys
route: /org/content/journeys
asked-as: "build an onboarding sequence", "card series", "completion per step"

A journey is an ordered path of briefing cards, used for onboarding or campaigns.
- **Create** — click **New journey**, enter a Name, choose the pacing, then click **Create journey**. Pacing is **Paced** (one card per session) or **Rapid** (consecutive cards in one session).
- **Detail view** — "Cards in order", where you drag to reorder or use "Add a card to this journey…"; plus "Flow", "Preview" (walk one member through it) and "Funnel" (completion per step).

Caveats: a card can also be put into a journey from the briefing card form's Sequence section. Deleting a journey detaches its cards; it does not delete them. Journeys have no publish state — each card's own Draft/Published state applies.

### OM-01-CT-04 · Announcements
tags: content, announcements, feed, pin, where-created
path: Content &gt; Announcements
route: /org/content/announcements
asked-as: "post an announcement", "pin something to the feed", "I can't find the new announcement button"

Caveat first: **announcements cannot be created on this page.** They are created from **Today &gt; "What's happening"**, the home feed composer. This page only edits, pins and deletes them.

- **Edit fields** — Title (max 200); Message, rich text with @mentions, max 4,000; Link (optional); **Pin to top of feed**; Image (JPEG/PNG/WebP/GIF, 10 MB), shown only when editing; attached documents (5 MB per file).
- **Publishing** — goes live immediately, with no draft or schedule.

### OM-01-CT-05 · Organization events
tags: content, events, calendar, timezone, targeting
path: Content &gt; Organization events
route: /org/content/events
asked-as: "add an org event", "event for one group", "event times are wrong"

- **Create** — click **New event**, then **Publish event**. It is published immediately to every group's "What's happening" and calendar.
- **Fields** — **Title** required; **Description** required, rich text; **Start** required; **End** optional and cannot be before Start; **Location** either Physical (address) or Online (meeting link, required); **Event image**, only when editing, 5 MB.

Caveats: times use your profile timezone. Org events cannot target single groups — for one group, post a group event from "What's happening" instead.

### OM-01-CT-06 · Shared media
tags: content, media, assets, upload, visibility, limits, logo
path: Content &gt; Shared media
route: /org/content/media
asked-as: "share our logo with groups", "upload photos for leaders", "media library", "file size limits"

- **Upload** — click **Upload media**, then **Choose files**. Per-file fields: Title; Description; Tags, up to 10; for videos, transcript, subtitle track and label; Visibility, either **All groups** or **Specific groups**.
- **Limits** — images 10 MB; videos MP4/WebM, 200 MB; subtitles .vtt/.srt, 2 MB.
- **Edit** — title, description, tags, subtitles, transcript and "Visible to". "Usage by group" is read-only.
- **Where it appears** — in each targeted group's **Media & Assets**. Briefing cards and onboarding videos can also pick from this library.

Caveat: /org/media ("Media assets") is a legacy duplicate of this page.

### OM-01-CT-07 · Video updates
tags: content, video, recording, targeting, archive, permissions
path: Content &gt; Video updates
route: /org/content/video-updates
asked-as: "record a video for my leaders", "send a video to one group", "who watched my video", "camera permission"

- **Record** — click **Record a video**, then: 1) **Start recording** — camera and microphone permission is needed; the guide length is 2:00 with a warning at 1:45, but it does not cut you off, and talking points are shown on screen. 2) **Stop recording**. 3) Pick a thumbnail and an optional title. 4) **Send to**: All leaders, Specific groups, or One leader. 5) **Send update**.
- **Archive** — stats, search, and "Watched status" per recipient.
- **Where it appears** — leaders' inbox, Explore "Video updates" for group admins, and a "Watch now" home card.

Caveats: deleting removes the video for recipients who have not watched it yet. The **Today** page's "Record today's announcement" button uses the same recorder. Onboarding videos are a separate feature under Settings (/org/settings/onboarding-videos).

# Knowledge Base

Filesystem-based RAG content for the Tectonica retrieval app. Each top-level folder
under `knowledge/` is a separate **bot** (e.g. `fundraising`). The retrieval app
indexes one bot per request and returns ranked markdown fragments — no embeddings,
no vector database.

See [`FilesystemRetrievalArchitecture_v1.pdf`](https://tectonica.ai) for the full
architectural rationale.

## Folder layout

```
knowledge/
  <bot-id>/
    <category>/
      <subcategory>/
        <file>.md
```

Subfolders are arbitrary — the search engine respects whatever hierarchy you create.
Use the `folders` parameter on the search endpoint to scope queries to a subtree
(e.g. `folders: ["tactics/peer-to-peer"]`).

## Markdown file format

Every file must start with YAML frontmatter. Body is plain markdown.

```markdown
---
title: Peer-to-Peer Dinner Fundraiser
tags: [peer-to-peer, small-group, first-timer, dinner]
group-size: [5-30]
archetype: [first-timer, patty-prime]
difficulty: beginner
content-type: tactic
source: shannon-working-doc
last-updated: 2026-04-29
---

# Title

Markdown body…
```

### Required fields

| Field   | Type            | Notes                                                     |
| ------- | --------------- | --------------------------------------------------------- |
| `title` | string          | Used for ranking (×3 weight) and as the bundle heading.   |
| `tags`  | array of string | Lowercased automatically. Drives tag filtering & ranking. |

### Recommended fields (used as facets / metadata pass-through)

| Field          | Type                         | Example values                                  |
| -------------- | ---------------------------- | ----------------------------------------------- |
| `group-size`   | string or array              | `[5-30]`, `small`, `[50-200]`                   |
| `archetype`    | string or array              | `first-timer`, `experienced-leader`             |
| `difficulty`   | string                       | `beginner`, `intermediate`, `advanced`          |
| `content-type` | string                       | `tactic`, `principle`, `script`, `story`        |
| `source`       | string                       | Provenance, useful for auditing.                |
| `last-updated` | ISO date (`YYYY-MM-DD`)      | Manual maintenance signal.                      |

Frontmatter parsing is tolerant: malformed YAML produces a warning in the server log
and the file is indexed with body-only fallback. Unknown fields are preserved and
returned verbatim under `frontmatter` in the API response.

## Adding a new bot

1. Create `knowledge/<bot-id>/` and put markdown files inside (any depth of subfolders).
2. No deployment or indexing step is required — the search endpoint builds the index per request.

The retrieval app code is bot-agnostic — no code changes are needed when adding bots.

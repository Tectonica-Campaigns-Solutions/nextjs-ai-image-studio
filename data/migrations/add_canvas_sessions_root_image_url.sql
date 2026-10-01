-- Migration: scope Studio "Saved versions" to the image being edited
-- Run in Supabase SQL Editor BEFORE deploying the "Saved versions per image" change
-- (the Studio selects these columns; without them saving and listing fail).
--
-- Semantics:
--   root_image_url  The image URL Studio was first opened with for this lineage.
--                   Every version saved from it (Save version, Send to chat
--                   snapshots, versions saved after Edit with AI or after
--                   reopening a sent image) inherits it, so the background_url
--                   can change while the lineage stays the same. Saved versions
--                   lists only rows with the current lineage.
--                   NULL -> legacy row; matched by background_url instead.
--   chat_id         Tectonica conversation the version was saved from (traceability).

ALTER TABLE client_canvas_sessions
  ADD COLUMN IF NOT EXISTS root_image_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS chat_id TEXT NULL;

CREATE INDEX IF NOT EXISTS client_canvas_sessions_user_root_image_idx
  ON client_canvas_sessions (ca_user_id, root_image_url)
  WHERE deleted_at IS NULL;

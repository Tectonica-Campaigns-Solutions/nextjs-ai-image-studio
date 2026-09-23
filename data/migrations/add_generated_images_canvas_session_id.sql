-- Migration: add canvas_session_id to generated_images
-- Run in Supabase SQL Editor BEFORE deploying the "Send to chat keeps layers" change.
--
-- Semantics:
--   When Studio sends a flattened image to the chat, it first saves the editable
--   layers as a client_canvas_sessions row and links it here. Reopening that
--   image URL in Studio (/api/images/{id}) resolves the session and restores the
--   clean background + editable layers instead of the flattened pixels.
--   NULL -> no editable layers (generated images, legacy Studio uploads).

ALTER TABLE generated_images
  ADD COLUMN IF NOT EXISTS canvas_session_id UUID NULL
  REFERENCES client_canvas_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS generated_images_canvas_session_id_idx
  ON generated_images (canvas_session_id)
  WHERE canvas_session_id IS NOT NULL;

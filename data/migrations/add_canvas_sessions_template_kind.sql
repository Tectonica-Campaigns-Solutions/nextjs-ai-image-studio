-- Migration: saved versions of Branding template designs
-- Run in Supabase SQL Editor BEFORE deploying the template "Save version" change
-- (requires create_brand_templates.sql).
--
-- Semantics:
--   kind            'image'    (default, existing rows): background_url + overlays.
--                   'template' : a design made from a Branding template. It has no
--                                background image; overlay_json holds the layout
--                                objects in the format's native pixels and
--                                template_state the format/background variant.
--   template_id     Template the design was made from. Saved versions of a
--                   template design list rows with the same template_id.
--   template_state  { "format": "square" | "portrait" | "story" | "landscape",
--                     "variantId": string | null }
--   background_url  Now nullable: template designs have no background image.

ALTER TABLE client_canvas_sessions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS template_id UUID NULL REFERENCES brand_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_state JSONB NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_canvas_sessions_kind_check'
  ) THEN
    ALTER TABLE client_canvas_sessions
      ADD CONSTRAINT client_canvas_sessions_kind_check CHECK (kind IN ('image', 'template'));
  END IF;
END $$;

ALTER TABLE client_canvas_sessions ALTER COLUMN background_url DROP NOT NULL;

CREATE INDEX IF NOT EXISTS client_canvas_sessions_user_template_idx
  ON client_canvas_sessions (ca_user_id, template_id)
  WHERE deleted_at IS NULL AND kind = 'template';

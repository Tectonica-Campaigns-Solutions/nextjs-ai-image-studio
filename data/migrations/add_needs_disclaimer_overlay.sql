-- Migration: add needs_disclaimer_overlay to generated_images
-- Run in Supabase SQL Editor BEFORE deploying the non-destructive disclaimer
-- pipeline (lib/image-disclaimer.ts NON_DESTRUCTIVE_DISCLAIMER flag).
--
-- Semantics:
--   true  -> supabase_path holds the CLEAN (pre-disclaimer) image; the proxy
--            (app/api/images/[id]/route.ts) must compose the overlay on every read.
--   false -> supabase_path holds the final image as-is (legacy bake-at-generation
--            method, or a caller that never wants a disclaimer, e.g. Studio uploads).
--            Default false keeps all existing rows behaving exactly as before.

ALTER TABLE generated_images
  ADD COLUMN IF NOT EXISTS needs_disclaimer_overlay BOOLEAN NOT NULL DEFAULT false;

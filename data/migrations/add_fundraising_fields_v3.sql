-- Migration: add consent_forms_url to client_fundraising_data
-- Run in Supabase SQL Editor

ALTER TABLE client_fundraising_data
  ADD COLUMN IF NOT EXISTS consent_forms_url TEXT;

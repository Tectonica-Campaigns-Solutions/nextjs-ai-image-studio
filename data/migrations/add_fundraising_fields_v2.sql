-- Migration: add cash_handling_process, org_messaging_notes, audience_knowledge_* to client_fundraising_data
-- Run in Supabase SQL Editor

ALTER TABLE client_fundraising_data
  ADD COLUMN IF NOT EXISTS cash_handling_process TEXT,
  ADD COLUMN IF NOT EXISTS org_messaging_notes TEXT,
  ADD COLUMN IF NOT EXISTS audience_knowledge_members TEXT,
  ADD COLUMN IF NOT EXISTS audience_knowledge_supporters TEXT,
  ADD COLUMN IF NOT EXISTS audience_knowledge_public TEXT;

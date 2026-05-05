-- ============================================================
-- Migration: create client_fundraising_data table
-- Description: Stores fundraising context per client (1:1 with clients).
--   - Organization variables: org_name, donation_page_url, approval_required, approval_turnaround
--   - User context: user_role_description
--   - Campaign variables: crm_access, crm_tool_note
-- ============================================================

create table if not exists public.client_fundraising_data (
  id                    uuid primary key default gen_random_uuid(),

  -- FK to clients (1:1 relationship)
  client_id             uuid not null unique references public.clients(id) on delete cascade,
  -- Denormalized for queries without joins (same pattern as canvas_sessions)
  ca_user_id            text not null,

  -- Organization variables
  org_name              text,
  donation_page_url     text,
  approval_required     boolean not null default false,
  approval_turnaround   text,

  -- User context variables
  user_role_description text,

  -- Campaign variables
  crm_access            boolean not null default false,
  crm_tool_note         text,

  -- Audit fields
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references auth.users(id) on delete set null,
  updated_by            uuid references auth.users(id) on delete set null,
  deleted_at            timestamptz
);

-- Auto-update updated_at on row modification
create or replace function public.set_updated_at_client_fundraising_data()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger handle_updated_at
  before update on public.client_fundraising_data
  for each row
  execute procedure public.set_updated_at_client_fundraising_data();

-- Index for lookups by client_id (covered by UNIQUE but explicit for clarity)
-- The UNIQUE constraint already creates an index, so no extra one needed.

-- Index for lookups by ca_user_id (used in queries that filter by user)
create index if not exists idx_client_fundraising_data_ca_user_id
  on public.client_fundraising_data (ca_user_id);

-- Index to support soft-delete filtering
create index if not exists idx_client_fundraising_data_deleted_at
  on public.client_fundraising_data (deleted_at)
  where deleted_at is null;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.client_fundraising_data enable row level security;

-- Allow full access to the service role (used by admin API routes via createAdminClient)
create policy "Service role has full access to client_fundraising_data"
  on public.client_fundraising_data
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
-- Grants (anon and authenticated roles have no direct access;
-- all access goes through the service role in server-side code)
-- ============================================================
revoke all on public.client_fundraising_data from anon, authenticated;

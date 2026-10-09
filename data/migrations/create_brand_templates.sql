-- ============================================================
-- Migration: create brand_templates + brand_template_formats
-- Description: Branding template library for Visual Studio.
--   - brand_templates: one row per template. client_id NULL = global
--     (available to every client); otherwise only that client sees it.
--     variants: background options the user can switch between, e.g.
--       [{"id":"v1","kind":"color","value":"#1D4ED8","label":"Blue"},
--        {"id":"v2","kind":"image","value":"https://…","label":"Rally"}]
--   - brand_template_formats: one layout per social format. fabric_json is
--     the canvas overlay (objects only, no background) at the format's
--     native size; editable objects carry slotId / slotType so content can
--     move between formats.
-- Run in Supabase SQL Editor BEFORE deploying the Branding templates admin.
-- ============================================================

create table if not exists public.brand_templates (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid references public.clients(id) on delete cascade,
  name            text not null,
  category        text,
  description     text,
  thumbnail_url   text,
  variants        jsonb not null default '[]'::jsonb,
  is_active       boolean not null default false,
  sort_order      integer not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  updated_by      uuid references auth.users(id) on delete set null,
  deleted_at      timestamptz,

  constraint brand_templates_variants_is_array check (jsonb_typeof(variants) = 'array')
);

create table if not exists public.brand_template_formats (
  id              uuid primary key default gen_random_uuid(),
  template_id     uuid not null references public.brand_templates(id) on delete cascade,
  format_key      text not null,
  width           integer not null check (width > 0),
  height          integer not null check (height > 0),
  fabric_json     jsonb not null default '{"objects":[]}'::jsonb,
  thumbnail_url   text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  updated_by      uuid references auth.users(id) on delete set null,

  constraint brand_template_formats_format_key_check
    check (format_key in ('square', 'portrait', 'story', 'landscape')),
  constraint brand_template_formats_template_format_unique
    unique (template_id, format_key)
);

-- Auto-update updated_at on row modification
create or replace function public.set_updated_at_brand_templates()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists handle_updated_at on public.brand_templates;
create trigger handle_updated_at
  before update on public.brand_templates
  for each row
  execute procedure public.set_updated_at_brand_templates();

drop trigger if exists handle_updated_at on public.brand_template_formats;
create trigger handle_updated_at
  before update on public.brand_template_formats
  for each row
  execute procedure public.set_updated_at_brand_templates();

-- Studio lists active templates for a client (+ globals)
create index if not exists idx_brand_templates_client_active
  on public.brand_templates (client_id, sort_order)
  where deleted_at is null and is_active;

create index if not exists idx_brand_template_formats_template_id
  on public.brand_template_formats (template_id);

-- ============================================================
-- Row Level Security
-- Accessed only server-side with the service role (dashboard API routes
-- after requireAdmin, and the Studio loader).
-- ============================================================
alter table public.brand_templates enable row level security;
alter table public.brand_template_formats enable row level security;

create policy "Service role has full access to brand_templates"
  on public.brand_templates
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

create policy "Service role has full access to brand_template_formats"
  on public.brand_template_formats
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

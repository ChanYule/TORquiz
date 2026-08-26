-- Community Care Quiz - Supabase schema
-- Run this in Supabase: SQL Editor -> New query -> Run

create table if not exists public.results (
  id uuid primary key,
  nickname text not null check (char_length(nickname) between 1 and 30),
  module_name text not null check (char_length(module_name) between 1 and 100),
  correct integer not null check (correct >= 0),
  wrong integer not null check (wrong >= 0),
  total integer not null check (total > 0),
  percentage numeric not null check (percentage >= 0 and percentage <= 100),
  passed boolean not null,
  completed_at timestamptz not null default now(),
  answers jsonb not null default '[]'::jsonb
);

-- Add missing columns if an older results table already exists.
alter table public.results add column if not exists module_name text;
alter table public.results add column if not exists correct integer;
alter table public.results add column if not exists wrong integer;
alter table public.results add column if not exists total integer;
alter table public.results add column if not exists percentage numeric;
alter table public.results add column if not exists passed boolean;
alter table public.results add column if not exists completed_at timestamptz;
alter table public.results add column if not exists answers jsonb;

-- Ensure the columns required by the current server exist with safe defaults for new rows.
alter table public.results alter column answers set default '[]'::jsonb;
alter table public.results alter column completed_at set default now();

create index if not exists results_completed_at_idx
  on public.results (completed_at desc);

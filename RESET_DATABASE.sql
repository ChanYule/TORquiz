-- WARNING: This deletes all existing quiz results.
-- Use this only if your existing results table was created with an incompatible schema.

drop table if exists public.results;

create table public.results (
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

create index results_completed_at_idx
  on public.results (completed_at desc);

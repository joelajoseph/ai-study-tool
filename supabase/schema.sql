-- Study Planner schema. Run once in your project's SQL editor
-- (Supabase dashboard → SQL Editor). Safe to re-run: every statement
-- only creates something if it's missing.

create table if not exists public.materials (
  id bigint generated always as identity primary key,
  title text not null,
  source_type text not null check (source_type in ('pdf', 'image', 'text')),
  extracted_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id bigint generated always as identity primary key,
  exam_date date not null,
  assessment_type text not null check (assessment_type in ('quiz', 'exam')),
  days_remaining_at_creation integer not null,
  overview text not null,
  topics_text text,
  prior_knowledge text,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_topics (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.plans on delete cascade,
  title text not null,
  priority_order integer not null,
  estimated_minutes integer not null,
  rationale text not null,
  suggested_day integer not null,
  materials jsonb not null default '[]'::jsonb,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Written by the Phase 3 chat feature; created now so the schema is settled.
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  plan_id bigint references public.plans on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists plan_topics_plan_id_idx on public.plan_topics (plan_id);
create index if not exists plans_created_at_idx on public.plans (created_at desc);
create index if not exists materials_created_at_idx on public.materials (created_at desc);
create index if not exists chat_messages_plan_id_idx on public.chat_messages (plan_id);

-- Later schema additions, kept here so the file stays the one source of truth
-- and is safe to re-run on an existing database.
alter table public.plans add column if not exists title text;
-- Materials belong to the plan they were uploaded with, so deleting a plan
-- cleans up its materials automatically.
alter table public.materials add column if not exists plan_id bigint references public.plans on delete cascade;

-- Every read/write happens server-side with the service role key, which
-- bypasses RLS. With RLS on and no policies, the anon/public key is locked
-- out entirely — the safe default for a single-user app.
alter table public.materials enable row level security;
alter table public.plans enable row level security;
alter table public.plan_topics enable row level security;
alter table public.chat_messages enable row level security;

-- Newer Supabase projects no longer grant table privileges to service_role
-- by default, and bypassing RLS doesn't help without SELECT/INSERT rights.
-- Grant them explicitly (idempotent — safe to re-run).
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

create extension if not exists pgcrypto;
create schema if not exists private;

create type public.user_role as enum ('admin', 'patient');
create type public.assignment_status as enum ('pending', 'completed', 'expired');
create type public.question_kind as enum ('number', 'single_choice', 'scale', 'long_text');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role public.user_role not null default 'patient',
  must_change_password boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  title text not null,
  help_text text,
  kind public.question_kind not null,
  required boolean not null default true,
  position integer not null,
  config jsonb not null default '{}'::jsonb,
  unique(form_id, position)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id),
  patient_id uuid not null references public.profiles(id),
  week_start date not null,
  due_at timestamptz not null,
  status public.assignment_status not null default 'pending',
  sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(patient_id, form_id, week_start)
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.assignments(id) on delete cascade,
  patient_id uuid not null references public.profiles(id),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  value jsonb not null,
  created_at timestamptz not null default now(),
  unique(response_id, question_id)
);

create index assignments_patient_due_idx on public.assignments(patient_id, due_at desc);
create index responses_patient_submitted_idx on public.responses(patient_id, submitted_at desc);
create index answers_response_idx on public.answers(response_id);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and active = true
  );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.forms enable row level security;
alter table public.questions enable row level security;
alter table public.assignments enable row level security;
alter table public.responses enable row level security;
alter table public.answers enable row level security;

create policy "profiles own or admin read" on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));
create policy "profiles own update" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles admin manage" on public.profiles for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "forms authenticated read" on public.forms for select to authenticated using (true);
create policy "forms admin manage" on public.forms for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "questions authenticated read" on public.questions for select to authenticated using (true);
create policy "questions admin manage" on public.questions for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "assignments patient or admin read" on public.assignments for select to authenticated
using (patient_id = (select auth.uid()) or (select private.is_admin()));
create policy "assignments admin manage" on public.assignments for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "assignments patient complete" on public.assignments for update to authenticated
using (patient_id = (select auth.uid())) with check (patient_id = (select auth.uid()));

create policy "responses patient or admin read" on public.responses for select to authenticated
using (patient_id = (select auth.uid()) or (select private.is_admin()));
create policy "responses patient insert" on public.responses for insert to authenticated
with check (patient_id = (select auth.uid()));
create policy "responses admin manage" on public.responses for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "answers patient or admin read" on public.answers for select to authenticated
using (
  exists (select 1 from public.responses r where r.id = response_id and r.patient_id = (select auth.uid()))
  or (select private.is_admin())
);
create policy "answers patient insert" on public.answers for insert to authenticated
with check (exists (select 1 from public.responses r where r.id = response_id and r.patient_id = (select auth.uid())));
create policy "answers admin manage" on public.answers for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

grant select on public.profiles to authenticated;
grant update (full_name, phone, must_change_password, updated_at) on public.profiles to authenticated;
grant select on public.forms, public.questions to authenticated;
grant select, update on public.assignments to authenticated;
grant select, insert on public.responses, public.answers to authenticated;


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

create or replace function public.submit_checkin_as_service(p_user_id uuid, p_assignment_id uuid, p_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_patient_id uuid;
  v_form_id uuid;
  v_status public.assignment_status;
  v_response_id uuid;
begin
  if p_user_id is null then
    raise exception 'User is required';
  end if;

  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Answers must be a JSON array';
  end if;

  select patient_id, form_id, status
    into v_patient_id, v_form_id, v_status
  from public.assignments
  where id = p_assignment_id
  for update;

  if not found or v_patient_id <> p_user_id then
    raise exception 'Assignment not found';
  end if;

  if v_status <> 'pending' then
    raise exception 'Assignment is not pending';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_answers) item
    left join public.questions q
      on q.id = (item ->> 'question_id')::uuid
     and q.form_id = v_form_id
    where q.id is null
  ) then
    raise exception 'An answer references an invalid question';
  end if;

  if exists (
    select item ->> 'question_id'
    from jsonb_array_elements(p_answers) item
    group by item ->> 'question_id'
    having count(*) > 1
  ) then
    raise exception 'Duplicate answers are not allowed';
  end if;

  if exists (
    select 1
    from public.questions q
    where q.form_id = v_form_id
      and q.required
      and not exists (
        select 1
        from jsonb_array_elements(p_answers) item
        where item ->> 'question_id' = q.id::text
          and item -> 'value' is not null
          and item -> 'value' <> 'null'::jsonb
      )
  ) then
    raise exception 'All required questions must be answered';
  end if;

  insert into public.responses (assignment_id, patient_id)
  values (p_assignment_id, p_user_id)
  returning id into v_response_id;

  insert into public.answers (response_id, question_id, value)
  select
    v_response_id,
    (item ->> 'question_id')::uuid,
    item -> 'value'
  from jsonb_array_elements(p_answers) item;

  update public.assignments
  set status = 'completed', completed_at = now()
  where id = p_assignment_id;

  return v_response_id;
end;
$$;

revoke all on function public.submit_checkin_as_service(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.submit_checkin_as_service(uuid, uuid, jsonb) to service_role;

grant select on public.profiles to authenticated;
grant update (full_name, phone, must_change_password, updated_at) on public.profiles to authenticated;
grant select, insert, update, delete on public.forms, public.questions to authenticated;
grant select, insert, delete on public.assignments to authenticated;
grant select on public.responses, public.answers to authenticated;


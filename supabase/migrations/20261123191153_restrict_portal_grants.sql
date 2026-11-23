revoke all on public.profiles, public.forms, public.questions, public.assignments, public.responses, public.answers from public, anon, authenticated;
grant select on public.profiles, public.forms, public.questions, public.assignments, public.responses, public.answers to authenticated;
grant update (full_name, phone, must_change_password, updated_at) on public.profiles to authenticated;
grant insert, update, delete on public.forms, public.questions to authenticated;
grant insert on public.assignments to authenticated;
grant update (feedback_at) on public.responses to authenticated;

drop policy if exists "assignments patient complete" on public.assignments;
drop policy if exists "responses patient insert" on public.responses;
drop policy if exists "answers patient insert" on public.answers;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

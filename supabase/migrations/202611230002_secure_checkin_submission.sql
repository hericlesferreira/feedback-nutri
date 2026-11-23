drop function if exists public.submit_checkin(uuid, jsonb);

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

create index if not exists forms_created_by_idx on public.forms(created_by);
create index if not exists assignments_form_idx on public.assignments(form_id);
create index if not exists answers_question_idx on public.answers(question_id);

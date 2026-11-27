create or replace function private.complete_password_activation() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare current_user_row auth.users%rowtype;
begin
  if (new.raw_app_meta_data ->> 'portal_profile_edit') is distinct from
     (old.raw_app_meta_data ->> 'portal_profile_edit') then
    select * into current_user_row from auth.users where id = new.id;
    update public.profiles
    set full_name = current_user_row.raw_user_meta_data ->> 'full_name',
        phone = current_user_row.raw_user_meta_data ->> 'phone',
        email = current_user_row.email,
        updated_at = now()
    where id = new.id and role = 'patient';
  end if;

  if (new.raw_app_meta_data ->> 'portal_password_reset') is distinct from
     (old.raw_app_meta_data ->> 'portal_password_reset') then
      update public.profiles set must_change_password = true, updated_at = now()
      where id = new.id and role = 'patient';
      delete from auth.sessions where user_id = new.id;
  elsif new.encrypted_password is distinct from old.encrypted_password
     and nullif(new.encrypted_password, '') is not null then
      select * into current_user_row from auth.users where id = new.id;
      if (current_user_row.raw_app_meta_data ->> 'portal_password_reset') is not distinct from
         (old.raw_app_meta_data ->> 'portal_password_reset') then
      update public.profiles set must_change_password = false, updated_at = now()
      where id = new.id and must_change_password;
      end if;
  end if;
  return new;
end;
$$;

drop trigger complete_portal_password_activation on auth.users;
create constraint trigger complete_portal_password_activation
after update on auth.users deferrable initially deferred
for each row execute function private.complete_password_activation();

create or replace function private.portal_account_ready() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    join auth.sessions s on s.user_id = p.id
    where p.id = (select auth.uid()) and p.active and not p.must_change_password
      and s.id::text = (select auth.jwt() ->> 'session_id')
  );
$$;

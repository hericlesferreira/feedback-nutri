revoke update (must_change_password) on public.profiles from authenticated;

create function private.complete_password_activation() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password
     and nullif(new.encrypted_password, '') is not null then
    update public.profiles set must_change_password = false, updated_at = now()
    where id = new.id and must_change_password;
  end if;
  return new;
end;
$$;
revoke all on function private.complete_password_activation() from public, anon, authenticated;
create trigger complete_portal_password_activation after update of encrypted_password on auth.users
for each row execute function private.complete_password_activation();

create function private.portal_account_ready() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles
    where id = (select auth.uid()) and active and not must_change_password);
$$;
revoke all on function private.portal_account_ready() from public, anon;
grant execute on function private.portal_account_ready() to authenticated;

do $$
declare relation text;
begin
  foreach relation in array array['forms','questions','assignments','responses','answers'] loop
    execute format('create policy portal_account_ready on public.%I as restrictive for all to authenticated using ((select private.portal_account_ready())) with check ((select private.portal_account_ready()))', relation);
  end loop;
end;
$$;

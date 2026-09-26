create extension if not exists pgcrypto;

create or replace function public.authenticate_admin(login_email text, login_password text)
returns table(id uuid, email text, full_name text, role text)
language sql
security definer
set search_path = public
as $$
  select app_users.id, app_users.email, app_users.full_name, app_users.role
  from public.app_users
  where lower(app_users.email) = lower(login_email)
    and app_users.password_hash = crypt(login_password, app_users.password_hash)
    and app_users.role = 'admin'
  limit 1;
$$;

revoke all on function public.authenticate_admin(text, text) from public;
grant execute on function public.authenticate_admin(text, text) to anon;
grant execute on function public.authenticate_admin(text, text) to authenticated;

insert into public.app_users (email, password_hash, full_name, role)
values (
  'admin@inventory.test',
  crypt('Admin@12345', gen_salt('bf')),
  'Demo Administrator',
  'admin'
)
on conflict (email) do update
set password_hash = excluded.password_hash,
    full_name = excluded.full_name,
    role = excluded.role;

notify pgrst, 'reload schema';

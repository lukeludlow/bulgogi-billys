-- Seed the admin allowlist (replaces the ADMIN_ALLOWED_EMAILS env var).
-- Add future admins with another insert here or in the SQL editor.
insert into public.admin_users (email) values ('lukeludlow@live.com')
on conflict do nothing;

-- The initial schema revoked EXECUTE on is_admin() from anon only, which
-- left the default PUBLIC grant intact — a lock that read as engaged but
-- wasn't. Revoke from PUBLIC and grant back explicitly to the one role
-- whose RLS policies actually call it.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

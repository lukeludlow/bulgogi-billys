-- Table-level grants for the authenticated role. Postgres checks these before
-- RLS ever runs, and the initial schema migration created the tables without
-- them. RLS (is_admin()) remains the actual gate: a signed-in non-admin passes
-- these grants but gets empty reads and rejected writes from the policies.
-- anon gets nothing.
grant select, insert, update, delete
    on all tables in schema public to authenticated;

-- Cover any tables added by future migrations too.
alter default privileges in schema public
    grant select, insert, update, delete on tables to authenticated;

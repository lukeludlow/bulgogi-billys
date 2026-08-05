-- Atomic config saves (BACKEND_ARCHITECTURE §7, REFACTOR_PLAN B5).
--
-- The config document — settings plus the five menu/recipe tables — used to be
-- written as a sequence of PostgREST statements, which is not a transaction.
-- The worst window was real: batch_lines and recipe_lines are rewritten
-- delete-all-then-insert, so a failure between the two left the database with
-- zero lines until a retry landed, and a browser closed in that window stranded
-- the only correct copy in one browser's localStorage.
--
-- One function, one transaction, one statement from the client's point of view.
--
-- The payload is the whole document, not a delta: rows absent from it are gone
-- when it returns. That means a stale tab can revert another tab's config edit
-- — true before this function existed too, since the diff already rewrote whole
-- sections — and it is what lets the client stop tracking deletes.
--
-- security invoker, so the caller's RLS policies still decide what happens; a
-- signed-in non-admin gets its inserts refused and the whole call rolls back.

create function public.apply_config(config jsonb) returns void
language plpgsql security invoker set search_path = ''
as $$
declare
    section text;
begin
    -- Reject a malformed envelope rather than acting on it. jsonb_populate_
    -- recordset(NULL) yields zero rows, so without this a client that omitted
    -- a key would silently empty that table instead of failing. An empty array
    -- still means what it says: the user deleted everything.
    -- `is distinct from`, not `<>`: a missing key makes jsonb_typeof return
    -- NULL, and NULL <> 'array' is NULL, which would skip the check that
    -- exists precisely for the missing-key case.
    if jsonb_typeof(config -> 'settings') is distinct from 'object' then
        raise exception 'apply_config: "settings" must be an object';
    end if;
    foreach section in array array[
        'ingredients', 'batch_lines', 'menu_items', 'variants', 'recipe_lines'
    ] loop
        if jsonb_typeof(config -> section) is distinct from 'array' then
            raise exception 'apply_config: "%" must be an array', section;
        end if;
    end loop;

    -- Columns listed explicitly because updated_at is DB-managed: the payload
    -- omits it and the column is not null.
    insert into public.settings (
        id, selected_protein, grocery_weekly_spend, packaging_cost_per_order,
        blended_food_cost_percent, employee_hourly_rate, sales_tax_rate_percent
    )
    select
        id, selected_protein, grocery_weekly_spend, packaging_cost_per_order,
        blended_food_cost_percent, employee_hourly_rate, sales_tax_rate_percent
    from jsonb_populate_record(null::public.settings, config -> 'settings')
    on conflict (id) do update set
        selected_protein = excluded.selected_protein,
        grocery_weekly_spend = excluded.grocery_weekly_spend,
        packaging_cost_per_order = excluded.packaging_cost_per_order,
        blended_food_cost_percent = excluded.blended_food_cost_percent,
        employee_hourly_rate = excluded.employee_hourly_rate,
        sales_tax_rate_percent = excluded.sales_tax_rate_percent;

    -- Children first. The cascades would cover it, but the order should read
    -- correctly on its own.
    --
    -- `position >= 0` rather than a bare DELETE: Supabase preloads
    -- pg_safeupdate for the `authenticated` role, which refuses an unqualified
    -- DELETE. Every one of these tables has a not-null `position` holding an
    -- array index, so the predicate matches all of them — and were it ever to
    -- spare a row, the insert below would collide on the primary key and roll
    -- the whole call back rather than half-write the document.
    delete from public.recipe_lines where position >= 0;
    delete from public.variants where position >= 0;
    delete from public.menu_items where position >= 0;
    delete from public.batch_lines where position >= 0;
    delete from public.ingredients where position >= 0;

    insert into public.ingredients
    select * from jsonb_populate_recordset(
        null::public.ingredients, config -> 'ingredients');

    insert into public.batch_lines
    select * from jsonb_populate_recordset(
        null::public.batch_lines, config -> 'batch_lines');

    insert into public.menu_items
    select * from jsonb_populate_recordset(
        null::public.menu_items, config -> 'menu_items');

    insert into public.variants
    select * from jsonb_populate_recordset(
        null::public.variants, config -> 'variants');

    insert into public.recipe_lines
    select * from jsonb_populate_recordset(
        null::public.recipe_lines, config -> 'recipe_lines');
end $$;

-- EXECUTE defaults to PUBLIC, and 20260727000002_grants.sql's default
-- privileges cover tables only — so the revoke has to be explicit, the same
-- lock 20260801000000_fix_is_admin_grants.sql put on is_admin().
revoke execute on function public.apply_config(jsonb) from public;
grant execute on function public.apply_config(jsonb) to authenticated;

-- PostgREST won't expose a function it hasn't seen.
notify pgrst, 'reload schema';

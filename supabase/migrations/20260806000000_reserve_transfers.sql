-- Reserve ledger + prescribed transfer rates, for the Weekly Review page
-- (ROADMAP 0.3; growth plan §14.2, §15.1–15.2, §27).
--
-- Reserves are a LEDGER, not a mutable balance: one row per transfer
-- (negative = withdrawal), balance = sum(amount). That buys history and
-- auditability, and "record this week's transfers" is an insert instead of a
-- read-modify-write. An opening balance is just a ledger row.

create table public.reserve_transfers (
    id text primary key, -- crypto.randomUUID() from the app
    date date not null, -- local calendar day, "YYYY-MM-DD"
    fund text not null check (fund in ('emergency', 'expansion')),
    amount numeric not null, -- dollars; negative for a withdrawal
    note text
);

create index reserve_transfers_date_idx on public.reserve_transfers (date desc);

alter table public.reserve_transfers enable row level security;
create policy "admin full access" on public.reserve_transfers
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- The weekly transfers the plan prescribes: 3% of pre-tax sales to the
-- emergency reserve, then 2% to the expansion fund (§15.1–15.2). Editable
-- because the family may tune them as reserves fill.
-- Defaults must match DEFAULT_SETTINGS in src/test/fixtures/defaultSettings.ts
-- (same convention as blended_food_cost_percent = 32).
alter table public.settings
    add column emergency_reserve_percent numeric not null default 3,
    add column expansion_fund_percent numeric not null default 2;

-- apply_config writes the settings columns by explicit list (updated_at is
-- DB-managed and must stay out of it), so the new columns have to be added
-- here. CREATE OR REPLACE keeps the function's existing grants.
create or replace function public.apply_config(config jsonb) returns void
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
        blended_food_cost_percent, employee_hourly_rate, sales_tax_rate_percent,
        emergency_reserve_percent, expansion_fund_percent
    )
    select
        id, selected_protein, grocery_weekly_spend, packaging_cost_per_order,
        blended_food_cost_percent, employee_hourly_rate, sales_tax_rate_percent,
        emergency_reserve_percent, expansion_fund_percent
    from jsonb_populate_record(null::public.settings, config -> 'settings')
    on conflict (id) do update set
        selected_protein = excluded.selected_protein,
        grocery_weekly_spend = excluded.grocery_weekly_spend,
        packaging_cost_per_order = excluded.packaging_cost_per_order,
        blended_food_cost_percent = excluded.blended_food_cost_percent,
        employee_hourly_rate = excluded.employee_hourly_rate,
        sales_tax_rate_percent = excluded.sales_tax_rate_percent,
        emergency_reserve_percent = excluded.emergency_reserve_percent,
        expansion_fund_percent = excluded.expansion_fund_percent;

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

-- PostgREST won't expose the new table/columns until it reloads.
notify pgrst, 'reload schema';

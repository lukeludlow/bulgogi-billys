-- Purchases log, market-day overrides, monthly processor fees, per-market pay.
--
-- Fuel/propane/ice/food are bought in shopping trips, not per event, so the
-- per-event fuel/propane columns move into a dated purchases log whose costs
-- the client allocates across the events between trips. Card-processor fees
-- are entered once per month from the Square statement. A day whose
-- auto-tagged market is wrong gets a stored override. market_classifications
-- grows into market_settings so per-market values (employee pay) have a home.

-- Shopping trips; the client distributes each purchase across the events
-- between it and the next purchase of the same category.
create table public.purchases (
    id text primary key, -- crypto.randomUUID() from the app
    date date not null,  -- local calendar day, "YYYY-MM-DD"
    category text not null
        check (category in ('food', 'fuel', 'propane', 'ice')),
    amount numeric not null default 0,
    note text
);

create index purchases_date_idx on public.purchases (date desc);

-- Manual correction for a day the schedule heuristic mis-tagged. Day-level:
-- the market model is one market per calendar day.
create table public.market_overrides (
    date date primary key,
    market text not null
        check (market in ('grogans-mill', 'new-caney', 'fm-1488', 'other'))
);

-- Monthly card-processor fee totals, entered from the Square statement.
create table public.processor_fees (
    month text primary key check (month ~ '^\d{4}-\d{2}$'), -- "YYYY-MM"
    amount numeric not null default 0
);

alter table public.purchases enable row level security;
create policy "admin full access" on public.purchases
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

alter table public.market_overrides enable row level security;
create policy "admin full access" on public.market_overrides
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

alter table public.processor_fees enable row level security;
create policy "admin full access" on public.processor_fees
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- Per-market settings; RLS and policies follow the rename. A null hourly rate
-- means "use the global settings.employee_hourly_rate".
alter table public.market_classifications rename to market_settings;
alter table public.market_settings add column employee_hourly_rate numeric;

-- Convert the recorded per-event fuel/propane spend into purchases dated the
-- event's day, then drop the columns. The allocator hands each converted
-- amount back to the events from that day forward, so historical reports stay
-- close to what was entered.
insert into public.purchases (id, date, category, amount, note)
select gen_random_uuid()::text, date, 'fuel', fuel,
       'migrated from event expenses (' || market || ')'
from public.events
where fuel > 0;

insert into public.purchases (id, date, category, amount, note)
select gen_random_uuid()::text, date, 'propane', propane,
       'migrated from event expenses (' || market || ')'
from public.events
where propane > 0;

alter table public.events
    drop column fuel,
    drop column propane;

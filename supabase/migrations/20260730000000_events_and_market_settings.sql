-- Market events: per-event direct expenses for the Event Contribution report.
-- An event is one market on one local calendar day; the market a sale belongs
-- to is derived client-side from the transaction timestamp, never stored.

create table public.events (
    date date not null, -- local calendar day, "YYYY-MM-DD"
    market text not null
        check (market in ('grogans-mill', 'new-caney', 'fm-1488', 'other')),
    market_fee numeric not null default 0,
    fuel numeric not null default 0,
    propane numeric not null default 0,
    waste numeric not null default 0,
    employee_hours numeric not null default 0,
    billys_hours numeric not null default 0, -- recorded, never subtracted
    primary key (date, market)
);

create index events_date_idx on public.events (date desc);

-- Manual five-way market classification (absent row = not yet classified).
create table public.market_classifications (
    market text primary key
        check (market in ('grogans-mill', 'new-caney', 'fm-1488', 'other')),
    classification text
        check (classification in ('growth', 'core', 'development', 'probation', 'exit'))
);

-- Defaults must match DEFAULT_SETTINGS in src/test/fixtures/defaultSettings.ts
-- (same convention as blended_food_cost_percent = 32).
alter table public.settings
    add column employee_hourly_rate numeric not null default 12,
    add column sales_tax_rate_percent numeric not null default 8.25;

alter table public.events enable row level security;
create policy "admin full access" on public.events
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

alter table public.market_classifications enable row level security;
create policy "admin full access" on public.market_classifications
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

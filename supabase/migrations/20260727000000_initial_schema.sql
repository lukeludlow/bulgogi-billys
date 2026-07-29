-- Admin dashboard schema: normalized replacement for the settings.json blob.
-- Single-tenant — every admin in admin_users shares the same data.

-- ── admin allowlist ─────────────────────────────────────────────────────────

create table public.admin_users (
    email text primary key
);

alter table public.admin_users enable row level security;

-- SECURITY DEFINER so the data-table policies can consult admin_users without
-- recursing through admin_users' own RLS.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
    select exists (
        select 1 from public.admin_users
        where email = (auth.jwt() ->> 'email')
    );
$$;

revoke execute on function public.is_admin() from anon;

create policy "admins read admin list" on public.admin_users
    for select to authenticated using (public.is_admin());
-- No insert/update/delete policies: the allowlist is managed via migrations
-- or the SQL editor, never from the app.

-- ── updated_at helper ───────────────────────────────────────────────────────

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end $$;

-- ── singleton scalars ───────────────────────────────────────────────────────

create table public.settings (
    id smallint primary key default 1 check (id = 1),
    selected_protein text not null default 'beef'
        check (selected_protein in ('beef', 'pork')),
    grocery_weekly_spend numeric not null default 0,
    packaging_cost_per_order numeric not null default 0,
    blended_food_cost_percent numeric not null default 32,
    updated_at timestamptz not null default now()
);

create trigger settings_updated_at before update on public.settings
    for each row execute function public.set_updated_at();

-- ── ingredients + batch sub-recipes ─────────────────────────────────────────

-- position columns everywhere: the UI shows these lists in a deliberate order.
create table public.ingredients (
    id text primary key,
    name text not null,
    unit text not null check (unit in ('lb', 'oz', 'each')),
    cost_per_unit numeric not null default 0,
    pricing text not null default 'direct' check (pricing in ('direct', 'batch')),
    batch_yield numeric check (pricing <> 'batch' or batch_yield is not null),
    position integer not null
);

-- Batch-line ids ("soy", "sugar") are only unique within one ingredient.
create table public.batch_lines (
    ingredient_id text not null references public.ingredients (id) on delete cascade,
    id text not null,
    name text not null,
    cost numeric not null default 0,
    position integer not null,
    primary key (ingredient_id, id)
);

-- ── menu items / variants / recipes ─────────────────────────────────────────

create table public.menu_items (
    id text primary key,
    name text not null,
    has_protein boolean not null default false,
    position integer not null
);

-- Variant ids ("small", "regular") repeat across items.
create table public.variants (
    item_id text not null references public.menu_items (id) on delete cascade,
    id text not null,
    label text not null,
    sell_price numeric not null default 0,
    units_sold_this_week numeric not null default 0,
    position integer not null,
    primary key (item_id, id)
);

-- ingredient_id deliberately has NO foreign key: it may be the sentinel
-- 'protein' (resolved client-side to the selected protein) or a since-deleted
-- ingredient — both tolerated by the app.
create table public.recipe_lines (
    item_id text not null,
    variant_id text not null,
    ingredient_id text not null,
    amount numeric not null default 0,
    position integer not null,
    primary key (item_id, variant_id, ingredient_id),
    foreign key (item_id, variant_id)
        references public.variants (item_id, id) on delete cascade
);

-- ── sales history ───────────────────────────────────────────────────────────

create table public.transactions (
    id text primary key, -- processor's "Transaction #", the dedupe key
    date timestamptz not null,
    amount numeric not null,
    type text not null,
    result text not null,
    method text not null,
    brand text -- null ↔ optional in the app
);

create index transactions_date_idx on public.transactions (date desc);

-- ── RLS: admins get full access to everything ───────────────────────────────

alter table public.settings enable row level security;
create policy "admin full access" on public.settings
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

alter table public.ingredients enable row level security;
create policy "admin full access" on public.ingredients
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

alter table public.batch_lines enable row level security;
create policy "admin full access" on public.batch_lines
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

alter table public.menu_items enable row level security;
create policy "admin full access" on public.menu_items
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

alter table public.variants enable row level security;
create policy "admin full access" on public.variants
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

alter table public.recipe_lines enable row level security;
create policy "admin full access" on public.recipe_lines
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

alter table public.transactions enable row level security;
create policy "admin full access" on public.transactions
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- Local-stack seed, applied by `supabase db reset` and by `supabase start` on a
-- fresh volume. Never runs against the hosted project.
--
-- Two jobs:
--   1. Give every allowlisted admin a local auth identity, so the magic-link
--      sign-in works locally. AdminLogin passes shouldCreateUser: false, so
--      without this there is nobody to sign in as.
--   2. Leave enough dashboard data that /admin renders. fetchSettings() returns
--      null when public.settings is empty, which shows the "Couldn't load the
--      dashboard data" screen instead of the app.
--
-- Everything is idempotent: re-running only fills in what's missing.

-- ── local auth identities for the admin allowlist ───────────────────────────

-- The local admin. Production admins are managed in the SQL editor and never
-- appear in the repo; everything below derives from this table, so this one
-- insert is all it takes to make the local stack sign-in-able.
insert into public.admin_users (email) values ('admin@example.test')
on conflict do nothing;

-- No password: sign-in is magic-link only, and the token is minted by GoTrue.
-- The token columns must be '' rather than NULL — GoTrue scans them into plain
-- Go strings and a NULL fails the whole lookup with "Database error finding
-- user" on every sign-in attempt.
insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token,
    reauthentication_token
)
select
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    admins.email,
    '',
    now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    '', '', '', '', '', '', '', ''
from public.admin_users as admins
where not exists (
    select 1 from auth.users where auth.users.email = admins.email
);

-- GoTrue looks the account up through its email identity, not auth.users alone.
insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
)
select
    users.email,
    users.id,
    jsonb_build_object(
        'sub', users.id::text,
        'email', users.email,
        'email_verified', true,
        'phone_verified', false
    ),
    'email',
    now(), now(), now()
from auth.users as users
where users.email in (select email from public.admin_users)
  and not exists (
    select 1 from auth.identities
    where auth.identities.provider = 'email'
      and auth.identities.provider_id = users.email
  );

-- ── baseline dashboard data ─────────────────────────────────────────────────

-- Singleton row; the column defaults match DEFAULT_SETTINGS in
-- src/test/fixtures/defaultSettings.ts (test fixture).
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- A slice of the app's default menu — enough for the calculator to compute
-- something recognizable. Tests seed their own rows on top.
insert into public.ingredients (id, name, unit, cost_per_unit, pricing, batch_yield, position)
values
    ('beef', 'Beef bulgogi', 'lb', 7.00, 'direct', null, 0),
    ('pork', 'Pork bulgogi', 'lb', 4.50, 'direct', null, 1),
    ('fries', 'French fries (raw)', 'oz', 0.08, 'direct', null, 2),
    ('cheese', 'Cheddar-jack cheese', 'oz', 0.25, 'direct', null, 3),
    ('seoul', 'Seoul sauce', 'oz', 0.20, 'batch', 80, 4),
    ('sriracha', 'Sriracha', 'oz', 0.10, 'direct', null, 5),
    ('sourCream', 'Sour cream', 'oz', 0.12, 'direct', null, 6)
on conflict (id) do nothing;

-- Sub-recipe behind the batch-priced ingredient: $16 over an 80 oz yield.
insert into public.batch_lines (ingredient_id, id, name, cost, position)
values
    ('seoul', 'soy', 'Soy sauce', 6, 0),
    ('seoul', 'sugar', 'Brown sugar', 3, 1),
    ('seoul', 'sesame', 'Sesame oil', 4, 2),
    ('seoul', 'garlic', 'Garlic & ginger', 3, 3)
on conflict (ingredient_id, id) do nothing;

insert into public.menu_items (id, name, has_protein, position)
values ('fries', 'Bulgogi Fries', true, 0)
on conflict (id) do nothing;

insert into public.variants (item_id, id, label, sell_price, units_sold_this_week, position)
values
    ('fries', 'small', 'Small', 7, 0, 0),
    ('fries', 'regular', 'Regular', 9, 0, 1),
    ('fries', 'large', 'Large', 12, 0, 2)
on conflict (item_id, id) do nothing;

-- ingredient_id 'protein' is the sentinel the app swaps for the selected protein.
insert into public.recipe_lines (item_id, variant_id, ingredient_id, amount, position)
values
    ('fries', 'small', 'fries', 4, 0),
    ('fries', 'small', 'protein', 0.15, 1),
    ('fries', 'small', 'cheese', 1, 2),
    ('fries', 'small', 'seoul', 0.5, 3),
    ('fries', 'small', 'sriracha', 0.25, 4),
    ('fries', 'small', 'sourCream', 0.5, 5),
    ('fries', 'regular', 'fries', 6, 0),
    ('fries', 'regular', 'protein', 0.25, 1),
    ('fries', 'regular', 'cheese', 1.5, 2),
    ('fries', 'regular', 'seoul', 0.75, 3),
    ('fries', 'regular', 'sriracha', 0.4, 4),
    ('fries', 'regular', 'sourCream', 0.75, 5),
    ('fries', 'large', 'fries', 9, 0),
    ('fries', 'large', 'protein', 0.35, 1),
    ('fries', 'large', 'cheese', 2, 2),
    ('fries', 'large', 'seoul', 1, 3),
    ('fries', 'large', 'sriracha', 0.5, 4),
    ('fries', 'large', 'sourCream', 1, 5)
on conflict (item_id, variant_id, ingredient_id) do nothing;

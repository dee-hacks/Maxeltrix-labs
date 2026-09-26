create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  role text not null default 'admin' check (role in ('admin', 'manager')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reorder_level integer not null default 0 check (reorder_level >= 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('in', 'out', 'adjustment')),
  quantity integer not null,
  note text,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.app_users enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists "Allow anon read categories" on public.categories;
create policy "Allow anon read categories"
on public.categories for select
to anon
using (true);

drop policy if exists "Allow anon read suppliers" on public.suppliers;
create policy "Allow anon read suppliers"
on public.suppliers for select
to anon
using (true);

drop policy if exists "Allow anon read products" on public.products;
create policy "Allow anon read products"
on public.products for select
to anon
using (true);

drop policy if exists "Allow anon read stock movements" on public.stock_movements;
create policy "Allow anon read stock movements"
on public.stock_movements for select
to anon
using (true);

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

insert into public.categories (name, description)
values
  ('Electronics', 'Devices, peripherals, and technology equipment'),
  ('Office Supplies', 'Consumables and workplace essentials'),
  ('Warehouse', 'Operational tools for storage and dispatch'),
  ('Packaging', 'Packing and shipping materials')
on conflict (name) do update
set description = excluded.description;

insert into public.suppliers (name, contact_name, email, phone, address)
values
  ('Northline Traders', 'Priya Raman', 'orders@northline.example', '+91 98765 41001', 'Bengaluru, Karnataka'),
  ('Metro Office Co.', 'Arjun Mehta', 'sales@metrooffice.example', '+91 98765 41002', 'Mumbai, Maharashtra'),
  ('BoxWorks Supply', 'Nisha Verma', 'hello@boxworks.example', '+91 98765 41003', 'Pune, Maharashtra')
on conflict do nothing;

insert into public.products (
  sku,
  name,
  description,
  category_id,
  supplier_id,
  stock_quantity,
  reorder_level,
  unit_price
)
values
  (
    'ELC-USB-C-001',
    'USB-C Docking Station',
    'Multi-port laptop docking station for workstations',
    (select id from public.categories where name = 'Electronics'),
    (select id from public.suppliers where name = 'Northline Traders' limit 1),
    18,
    12,
    5499
  ),
  (
    'OFF-CHAIR-002',
    'Ergonomic Task Chair',
    'Adjustable office chair with lumbar support',
    (select id from public.categories where name = 'Office Supplies'),
    (select id from public.suppliers where name = 'Metro Office Co.' limit 1),
    9,
    10,
    7999
  ),
  (
    'WRH-SCANNER-003',
    'Barcode Scanner',
    'USB handheld scanner for warehouse receiving',
    (select id from public.categories where name = 'Warehouse'),
    (select id from public.suppliers where name = 'Northline Traders' limit 1),
    32,
    8,
    2899
  ),
  (
    'PKG-TAPE-004',
    'Heavy Duty Packing Tape',
    'Clear carton sealing tape for dispatch',
    (select id from public.categories where name = 'Packaging'),
    (select id from public.suppliers where name = 'BoxWorks Supply' limit 1),
    124,
    30,
    149
  ),
  (
    'OFF-PAPER-005',
    'A4 Printer Paper Ream',
    'Bright white 500 sheet paper ream',
    (select id from public.categories where name = 'Office Supplies'),
    (select id from public.suppliers where name = 'Metro Office Co.' limit 1),
    16,
    25,
    349
  )
on conflict (sku) do update
set name = excluded.name,
    description = excluded.description,
    category_id = excluded.category_id,
    supplier_id = excluded.supplier_id,
    stock_quantity = excluded.stock_quantity,
    reorder_level = excluded.reorder_level,
    unit_price = excluded.unit_price;

insert into public.stock_movements (product_id, movement_type, quantity, note, created_by, created_at)
values
  (
    (select id from public.products where sku = 'PKG-TAPE-004'),
    'in',
    40,
    'Monthly replenishment',
    (select id from public.app_users where email = 'admin@inventory.test'),
    now() - interval '3 days'
  ),
  (
    (select id from public.products where sku = 'WRH-SCANNER-003'),
    'out',
    6,
    'Issued to dispatch team',
    (select id from public.app_users where email = 'admin@inventory.test'),
    now() - interval '2 days'
  ),
  (
    (select id from public.products where sku = 'OFF-PAPER-005'),
    'adjustment',
    -2,
    'Cycle count correction',
    (select id from public.app_users where email = 'admin@inventory.test'),
    now() - interval '1 day'
  );

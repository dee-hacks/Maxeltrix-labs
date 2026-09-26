-- ============================================================================
-- 2026-05-26: Product catalog enhancement
-- Detailed product description, product-specific quality information, dynamic
-- category attributes, variants, price history, and customer purchase requests.
-- ============================================================================
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. Extend products with catalog, pricing, quality, warranty, physical,
--    package, origin, environmental and delivery fields.
-- ============================================================================
alter table public.products add column if not exists barcode text;
alter table public.products add column if not exists brand text;
alter table public.products add column if not exists model text;
alter table public.products add column if not exists short_description text;
alter table public.products add column if not exists detailed_description text;
alter table public.products add column if not exists key_features text[];
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists thumbnail_url text;
alter table public.products add column if not exists is_active boolean not null default true;

-- Pricing (unit_price remains the purchase price used for inventory valuation)
alter table public.products add column if not exists selling_price numeric(12, 2);
alter table public.products add column if not exists mrp numeric(12, 2);
alter table public.products add column if not exists tax_percent numeric(5, 2) not null default 0;

-- Quality grade / condition
alter table public.products add column if not exists quality_grade text;
alter table public.products add column if not exists "condition" text;
alter table public.products add column if not exists quality_notes text;

-- Warranty
alter table public.products add column if not exists warranty_period text;
alter table public.products add column if not exists warranty_type text;
alter table public.products add column if not exists warranty_provider text;
alter table public.products add column if not exists warranty_coverage text;
alter table public.products add column if not exists warranty_exclusions text;
alter table public.products add column if not exists warranty_start date;
alter table public.products add column if not exists warranty_end date;

-- Care, safety and assembly
alter table public.products add column if not exists care_instructions text[];
alter table public.products add column if not exists safety_instructions text[];
alter table public.products add column if not exists assembly_required boolean not null default false;
alter table public.products add column if not exists assembly_time text;
alter table public.products add column if not exists tools_required text;
alter table public.products add column if not exists assembly_service text;

-- Physical specifications
alter table public.products add column if not exists length_cm numeric(10, 2);
alter table public.products add column if not exists width_cm numeric(10, 2);
alter table public.products add column if not exists height_cm numeric(10, 2);
alter table public.products add column if not exists depth_cm numeric(10, 2);
alter table public.products add column if not exists volume_litres numeric(10, 2);
alter table public.products add column if not exists net_weight_kg numeric(10, 2);
alter table public.products add column if not exists gross_weight_kg numeric(10, 2);
alter table public.products add column if not exists load_capacity_kg numeric(10, 2);
alter table public.products add column if not exists load_capacity_label text;

-- Package and quantity
alter table public.products add column if not exists package_weight_kg numeric(10, 2);
alter table public.products add column if not exists package_length_cm numeric(10, 2);
alter table public.products add column if not exists package_width_cm numeric(10, 2);
alter table public.products add column if not exists package_height_cm numeric(10, 2);
alter table public.products add column if not exists package_contents text[];
alter table public.products add column if not exists quantity_per_pack numeric(10, 2);
alter table public.products add column if not exists quantity_unit text;

-- Origin and environment
alter table public.products add column if not exists country_of_origin text;
alter table public.products add column if not exists material_sustainability text;
alter table public.products add column if not exists recycled_content text;
alter table public.products add column if not exists recyclable_packaging text;
alter table public.products add column if not exists wood_certification text;
alter table public.products add column if not exists eco_friendly_packaging boolean not null default false;

-- Delivery
alter table public.products add column if not exists delivery_category text
  check (delivery_category in ('SMALL', 'MEDIUM', 'LARGE', 'HEAVY'));
alter table public.products add column if not exists estimated_delivery text;

-- ============================================================================
-- 2. Dynamic attribute system (category-specific product information)
--    attribute_definitions  -> what fields exist per category / globally
--    product_attribute_values -> the values per product (EAV)
-- ============================================================================
create table if not exists public.attribute_definitions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete cascade,
  field_key text not null,
  label text not null,
  group_key text not null default 'specifications',
  group_label text not null default 'Specifications',
  value_type text not null default 'text'
    check (value_type in ('text', 'textarea', 'number', 'boolean', 'select', 'multiline_list')),
  options jsonb,
  unit text,
  is_required boolean not null default false,
  is_customer_visible boolean not null default true,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category_id, field_key)
);

create table if not exists public.product_attribute_values (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  definition_id uuid not null references public.attribute_definitions(id) on delete cascade,
  value jsonb not null,
  created_at timestamptz not null default now(),
  unique (product_id, definition_id)
);

-- ============================================================================
-- 3. Product variants (colour / size), images, price history and purchase
--    requests.
-- ============================================================================
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  sku text not null,
  colour text,
  size text,
  selling_price numeric(12, 2),
  mrp numeric(12, 2),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  net_weight_kg numeric(10, 2),
  length_cm numeric(10, 2),
  width_cm numeric(10, 2),
  height_cm numeric(10, 2),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  unique (product_id, sku)
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0
);

create table if not exists public.product_price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(12, 2) not null,
  price_type text not null default 'selling'
    check (price_type in ('selling', 'mrp', 'purchase')),
  note text,
  recorded_at timestamptz not null default now()
);

create table if not exists public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  delivery_address text not null,
  city text,
  pincode text,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'info_required', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  admin_note text,
  status_history jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 4. Triggers
-- ============================================================================
-- ============================================================================
-- 5. Row level security
--    Catalog data: anonymous read (mirrors the existing products policy).
--    Purchase requests: anonymous insert + select; status updates go through
--    the authenticate_admin-gated helper below.
-- ============================================================================
alter table public.attribute_definitions enable row level security;
alter table public.product_attribute_values enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.product_price_history enable row level security;
alter table public.purchase_requests enable row level security;

drop policy if exists "Allow anon read attribute definitions" on public.attribute_definitions;
create policy "Allow anon read attribute definitions"
on public.attribute_definitions for select
to anon
using (true);

drop policy if exists "Allow anon read product attributes" on public.product_attribute_values;
create policy "Allow anon read product attributes"
on public.product_attribute_values for select
to anon
using (true);

drop policy if exists "Allow anon read product variants" on public.product_variants;
create policy "Allow anon read product variants"
on public.product_variants for select
to anon
using (true);

drop policy if exists "Allow anon read product images" on public.product_images;
create policy "Allow anon read product images"
on public.product_images for select
to anon
using (true);

drop policy if exists "Allow anon read price history" on public.product_price_history;
create policy "Allow anon read price history"
on public.product_price_history for select
to anon
using (true);

drop policy if exists "Allow anon insert purchase requests" on public.purchase_requests;
create policy "Allow anon insert purchase requests"
on public.purchase_requests for insert
to anon
with check (true);

drop policy if exists "Allow anon read purchase requests" on public.purchase_requests;
create policy "Allow anon read purchase requests"
on public.purchase_requests for select
to anon
using (true);

-- ============================================================================
-- 6. Admin helper: update a purchase request status and append the record to
--    status_history. Only an admin role may execute it.
-- ============================================================================
create or replace function public.update_purchase_request_status(
  request_id uuid,
  new_status text,
  admin_note_value text default null
)
returns public.purchase_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.purchase_requests;
begin
  update public.purchase_requests
  set status = new_status,
      admin_note = coalesce(admin_note_value, admin_note),
      status_history = status_history || jsonb_build_object(
        'status', new_status,
        'note', admin_note_value,
        'at', now()
      )
  where purchase_requests.id = request_id
  returning * into updated;

  if not found then
    raise exception 'Purchase request % not found', request_id;
  end if;

  return updated;
end;
$$;

revoke all on function public.update_purchase_request_status(uuid, text, text) from public;
grant execute on function public.update_purchase_request_status(uuid, text, text) to anon;
grant execute on function public.update_purchase_request_status(uuid, text, text) to authenticated;
-- ============================================================================
-- 7. Seed: categories and attribute definitions
-- ============================================================================
insert into public.categories (name, description)
values
  ('Furniture', 'Tables, chairs, sofas and other furnishing items'),
  ('Fabric & Clothing', 'Textiles, apparel and fabric products'),
  ('Appliances', 'Electrical appliances and equipment')
on conflict (name) do update
set description = excluded.description;

-- Global attribute definitions (apply to every product category)
insert into public.attribute_definitions
  (category_id, field_key, label, group_key, group_label, value_type, options, unit, is_required, is_customer_visible, sort_order)
select
  null, v.field_key, v.label, v.group_key, v.group_label, v.value_type,
  v.options::jsonb, v.unit, v.is_required, v.is_customer_visible, v.sort_order
from (values
  -- Durability & Quality
  ('expected_usage', 'Expected Usage', 'durability', 'Durability & Quality', 'text', null, null, false, true, 10),
  ('construction_quality', 'Construction Quality', 'durability', 'Durability & Quality', 'text', null, null, false, true, 20),
  ('material_durability', 'Material Durability', 'durability', 'Durability & Quality', 'text', null, null, false, true, 30),
  ('scratch_resistance', 'Scratch Resistance', 'durability', 'Durability & Quality', 'text', null, null, false, true, 40),
  ('water_resistance', 'Water Resistance', 'durability', 'Durability & Quality', 'select', '["High","Moderate","Low","Not Applicable"]', null, false, true, 50),
  ('heat_resistance', 'Heat Resistance', 'durability', 'Durability & Quality', 'select', '["High","Moderate","Low","Not Applicable"]', null, false, true, 60),
  ('rust_resistance', 'Rust Resistance', 'durability', 'Durability & Quality', 'select', '["High","Moderate","Low","Not Applicable"]', null, false, true, 70),
  ('uv_resistance', 'UV Resistance', 'durability', 'Durability & Quality', 'select', '["Yes","No","Not Applicable"]', null, false, true, 80),
  -- Colour
  ('primary_colour', 'Primary Colour', 'colour', 'Colour', 'text', null, null, false, true, 10),
  ('available_colours', 'Available Colours', 'colour', 'Colour', 'multiline_list', null, null, false, true, 20),
  ('colour_finish', 'Colour Finish', 'colour', 'Colour', 'text', null, null, false, true, 30),
  -- Finish
  ('finish_type', 'Finish Type', 'finish', 'Finish', 'text', null, null, false, true, 10),
  ('surface_treatment', 'Surface Treatment', 'finish', 'Finish', 'text', null, null, false, true, 20),
  ('polish', 'Polish', 'finish', 'Finish', 'text', null, null, false, true, 30),
  ('coating', 'Coating', 'finish', 'Finish', 'text', null, null, false, true, 40),
  ('surface_texture', 'Surface Texture', 'finish', 'Finish', 'text', null, null, false, true, 50)
) as v(field_key, label, group_key, group_label, value_type, options, unit, is_required, is_customer_visible, sort_order)
where not exists (
  select 1 from public.attribute_definitions d
  where d.field_key = v.field_key and d.category_id is null
);
-- Furniture attribute definitions
insert into public.attribute_definitions
  (category_id, field_key, label, group_key, group_label, value_type, options, unit, is_required, is_customer_visible, sort_order)
select
  (select id from public.categories where name = 'Furniture'),
  v.field_key, v.label, v.group_key, v.group_label, v.value_type,
  v.options::jsonb, v.unit, v.is_required, v.is_customer_visible, v.sort_order
from (values
  -- Material
  ('primary_material', 'Primary Material', 'material', 'Material & Quality', 'text', null, null, false, true, 10),
  ('material_type', 'Material Type', 'material', 'Material & Quality', 'text', null, null, false, true, 20),
  ('material_quality', 'Material Quality', 'material', 'Material & Quality', 'text', null, null, false, true, 30),
  ('material_percentage', 'Material Percentage', 'material', 'Material & Quality', 'text', null, null, false, true, 40),
  ('secondary_materials', 'Secondary Materials', 'material', 'Material & Quality', 'text', null, null, false, true, 50),
  ('surface_finish', 'Surface Finish', 'material', 'Material & Quality', 'text', null, null, false, true, 60),
  ('construction_type', 'Construction Type', 'material', 'Material & Quality', 'text', null, null, false, true, 70),
  -- Wood information
  ('wood_type', 'Wood Type', 'wood', 'Wood Information', 'text', null, null, false, true, 10),
  ('wood_grade', 'Wood Grade', 'wood', 'Wood Information', 'text', null, null, false, true, 20),
  ('wood_quality', 'Wood Quality', 'wood', 'Wood Information', 'text', null, null, false, true, 30),
  ('wood_content', 'Wood Content', 'wood', 'Wood Information', 'text', null, null, false, true, 40),
  ('moisture_treatment', 'Moisture Treatment', 'wood', 'Wood Information', 'text', null, null, false, true, 50),
  ('wood_finish', 'Wood Finish', 'wood', 'Wood Information', 'text', null, null, false, true, 60),
  ('frame_material', 'Frame Material', 'wood', 'Wood Information', 'text', null, null, false, true, 70),
  ('joint_type', 'Joint Type', 'wood', 'Wood Information', 'text', null, null, false, true, 80),
  ('hardware_material', 'Hardware Material', 'wood', 'Wood Information', 'text', null, null, false, true, 90),
  -- Capacity
  ('seating_capacity', 'Seating Capacity', 'capacity', 'Capacity', 'number', null, 'persons', false, true, 10),
  ('maximum_user_weight', 'Maximum User Weight', 'capacity', 'Capacity', 'text', null, null, false, true, 20),
  ('shelf_load', 'Shelf Load', 'capacity', 'Capacity', 'text', null, null, false, true, 30),
  -- Fabric information
  ('fabric_type', 'Fabric Type', 'fabric', 'Fabric Information', 'text', null, null, false, true, 10),
  ('fabric_material', 'Fabric Material', 'fabric', 'Fabric Information', 'text', null, null, false, true, 20),
  ('fabric_composition', 'Fabric Composition', 'fabric', 'Fabric Information', 'text', null, null, false, true, 30),
  ('fabric_quality', 'Fabric Quality', 'fabric', 'Fabric Information', 'text', null, null, false, true, 40),
  ('fabric_gsm', 'Fabric Weight', 'fabric', 'Fabric Information', 'number', null, 'GSM', false, true, 50),
  ('fabric_colour', 'Fabric Colour', 'fabric', 'Fabric Information', 'text', null, null, false, true, 60),
  ('fabric_pattern', 'Pattern', 'fabric', 'Fabric Information', 'text', null, null, false, true, 70),
  ('fabric_texture', 'Texture', 'fabric', 'Fabric Information', 'text', null, null, false, true, 80),
  ('abrasion_resistance', 'Abrasion Resistance', 'fabric', 'Fabric Information', 'text', null, null, false, true, 90),
  ('fabric_cleaning', 'Cleaning Method', 'fabric', 'Fabric Information', 'text', null, null, false, true, 100),
  -- Leather information
  ('leather_type', 'Leather Type', 'leather', 'Leather Information', 'text', null, null, false, true, 10),
  ('leather_grade', 'Leather Grade', 'leather', 'Leather Information', 'text', null, null, false, true, 20),
  ('leather_percentage', 'Leather Percentage', 'leather', 'Leather Information', 'text', null, null, false, true, 30),
  ('leather_finish', 'Finish', 'leather', 'Leather Information', 'text', null, null, false, true, 40),
  ('leather_texture', 'Texture', 'leather', 'Leather Information', 'text', null, null, false, true, 50),
  ('leather_care', 'Care Instructions', 'leather', 'Leather Information', 'text', null, null, false, true, 60),
  -- Metal information
  ('metal_type', 'Metal Type', 'metal', 'Metal Information', 'text', null, null, false, true, 10),
  ('metal_grade', 'Metal Grade', 'metal', 'Metal Information', 'text', null, null, false, true, 20),
  ('metal_thickness', 'Thickness', 'metal', 'Metal Information', 'text', null, null, false, true, 30),
  ('metal_coating', 'Coating', 'metal', 'Metal Information', 'text', null, null, false, true, 40),
  ('metal_finish', 'Finish', 'metal', 'Metal Information', 'text', null, null, false, true, 50),
  ('corrosion_resistance', 'Corrosion Resistance', 'metal', 'Metal Information', 'text', null, null, false, true, 60),
  -- Plastic information
  ('plastic_type', 'Plastic Type', 'plastic', 'Plastic Information', 'text', null, null, false, true, 10),
  ('plastic_grade', 'Material Grade', 'plastic', 'Plastic Information', 'text', null, null, false, true, 20),
  ('plastic_thickness', 'Thickness', 'plastic', 'Plastic Information', 'text', null, null, false, true, 30),
  ('temperature_resistance', 'Temperature Resistance', 'plastic', 'Plastic Information', 'text', null, null, false, true, 40),
  ('plastic_weight_capacity', 'Weight Capacity', 'plastic', 'Plastic Information', 'text', null, null, false, true, 50)
) as v(field_key, label, group_key, group_label, value_type, options, unit, is_required, is_customer_visible, sort_order)
where not exists (
  select 1 from public.attribute_definitions d
  join public.categories c on c.id = d.category_id
  where d.field_key = v.field_key and c.name = 'Furniture'
);
-- Attribute definitions for Electronics, Office Supplies, Warehouse,
-- Packaging, Fabric & Clothing and Appliances categories
insert into public.attribute_definitions
  (category_id, field_key, label, group_key, group_label, value_type, options, unit, is_required, is_customer_visible, sort_order)
select
  (select id from public.categories where name = v.cat_name),
  v.field_key, v.label, v.group_key, v.group_label, v.value_type,
  v.options::jsonb, v.unit, v.is_required, v.is_customer_visible, v.sort_order
from (values
  -- Electronics
  ('Electronics', 'processor', 'Processor', 'electronic', 'Electronic Information', 'text', null, null, false, true, 10),
  ('Electronics', 'ram', 'RAM', 'electronic', 'Electronic Information', 'text', null, null, false, true, 20),
  ('Electronics', 'storage', 'Storage', 'electronic', 'Electronic Information', 'text', null, null, false, true, 30),
  ('Electronics', 'display', 'Display', 'electronic', 'Electronic Information', 'text', null, null, false, true, 40),
  ('Electronics', 'battery', 'Battery', 'electronic', 'Electronic Information', 'text', null, null, false, true, 50),
  ('Electronics', 'power_rating', 'Power', 'electronic', 'Electronic Information', 'text', null, null, false, true, 60),
  ('Electronics', 'voltage', 'Voltage', 'electronic', 'Electronic Information', 'text', null, null, false, true, 70),
  ('Electronics', 'connectivity', 'Connectivity', 'electronic', 'Electronic Information', 'text', null, null, false, true, 80),
  ('Electronics', 'operating_system', 'Operating System', 'electronic', 'Electronic Information', 'text', null, null, false, true, 90),
  ('Electronics', 'included_accessories', 'Included Accessories', 'electronic', 'Electronic Information', 'text', null, null, false, true, 100),
  -- Office Supplies (metal / plastic / fabric)
  ('Office Supplies', 'metal_type', 'Metal Type', 'metal', 'Metal Information', 'text', null, null, false, true, 10),
  ('Office Supplies', 'metal_grade', 'Metal Grade', 'metal', 'Metal Information', 'text', null, null, false, true, 20),
  ('Office Supplies', 'metal_thickness', 'Thickness', 'metal', 'Metal Information', 'text', null, null, false, true, 30),
  ('Office Supplies', 'metal_coating', 'Coating', 'metal', 'Metal Information', 'text', null, null, false, true, 40),
  ('Office Supplies', 'metal_finish', 'Finish', 'metal', 'Metal Information', 'text', null, null, false, true, 50),
  ('Office Supplies', 'corrosion_resistance', 'Corrosion Resistance', 'metal', 'Metal Information', 'text', null, null, false, true, 60),
  ('Office Supplies', 'plastic_type', 'Plastic Type', 'plastic', 'Plastic Information', 'text', null, null, false, true, 10),
  ('Office Supplies', 'plastic_grade', 'Material Grade', 'plastic', 'Plastic Information', 'text', null, null, false, true, 20),
  ('Office Supplies', 'plastic_thickness', 'Thickness', 'plastic', 'Plastic Information', 'text', null, null, false, true, 30),
  ('Office Supplies', 'temperature_resistance', 'Temperature Resistance', 'plastic', 'Plastic Information', 'text', null, null, false, true, 40),
  ('Office Supplies', 'plastic_weight_capacity', 'Weight Capacity', 'plastic', 'Plastic Information', 'text', null, null, false, true, 50),
  ('Office Supplies', 'fabric_type', 'Fabric Type', 'fabric', 'Fabric Information', 'text', null, null, false, true, 10),
  ('Office Supplies', 'fabric_material', 'Fabric Material', 'fabric', 'Fabric Information', 'text', null, null, false, true, 20),
  ('Office Supplies', 'fabric_composition', 'Fabric Composition', 'fabric', 'Fabric Information', 'text', null, null, false, true, 30),
  ('Office Supplies', 'fabric_quality', 'Fabric Quality', 'fabric', 'Fabric Information', 'text', null, null, false, true, 40),
  ('Office Supplies', 'fabric_gsm', 'Fabric Weight', 'fabric', 'Fabric Information', 'number', null, 'GSM', false, true, 50),
  ('Office Supplies', 'fabric_colour', 'Fabric Colour', 'fabric', 'Fabric Information', 'text', null, null, false, true, 60),
  ('Office Supplies', 'fabric_texture', 'Texture', 'fabric', 'Fabric Information', 'text', null, null, false, true, 70),
  ('Office Supplies', 'fabric_cleaning', 'Cleaning Method', 'fabric', 'Fabric Information', 'text', null, null, false, true, 80)
) as v(cat_name, field_key, label, group_key, group_label, value_type, options, unit, is_required, is_customer_visible, sort_order)
where not exists (
  select 1 from public.attribute_definitions d
  join public.categories c on c.id = d.category_id
  where d.field_key = v.field_key and c.name = v.cat_name
);
-- Warehouse, Packaging, Fabric & Clothing and Appliances definitions
insert into public.attribute_definitions
  (category_id, field_key, label, group_key, group_label, value_type, options, unit, is_required, is_customer_visible, sort_order)
select
  (select id from public.categories where name = v.cat_name),
  v.field_key, v.label, v.group_key, v.group_label, v.value_type,
  v.options::jsonb, v.unit, v.is_required, v.is_customer_visible, v.sort_order
from (values
  -- Warehouse
  ('Warehouse', 'metal_type', 'Metal Type', 'metal', 'Metal Information', 'text', null, null, false, true, 10),
  ('Warehouse', 'metal_grade', 'Metal Grade', 'metal', 'Metal Information', 'text', null, null, false, true, 20),
  ('Warehouse', 'metal_thickness', 'Thickness', 'metal', 'Metal Information', 'text', null, null, false, true, 30),
  ('Warehouse', 'metal_finish', 'Finish', 'metal', 'Metal Information', 'text', null, null, false, true, 40),
  ('Warehouse', 'corrosion_resistance', 'Corrosion Resistance', 'metal', 'Metal Information', 'text', null, null, false, true, 50),
  ('Warehouse', 'plastic_type', 'Plastic Type', 'plastic', 'Plastic Information', 'text', null, null, false, true, 10),
  ('Warehouse', 'plastic_grade', 'Material Grade', 'plastic', 'Plastic Information', 'text', null, null, false, true, 20),
  ('Warehouse', 'plastic_thickness', 'Thickness', 'plastic', 'Plastic Information', 'text', null, null, false, true, 30),
  ('Warehouse', 'temperature_resistance', 'Temperature Resistance', 'plastic', 'Plastic Information', 'text', null, null, false, true, 40),
  ('Warehouse', 'plastic_weight_capacity', 'Weight Capacity', 'plastic', 'Plastic Information', 'text', null, null, false, true, 50),
  ('Warehouse', 'processor', 'Processor', 'electronic', 'Electronic Information', 'text', null, null, false, true, 10),
  ('Warehouse', 'ram', 'RAM', 'electronic', 'Electronic Information', 'text', null, null, false, true, 20),
  ('Warehouse', 'storage', 'Storage', 'electronic', 'Electronic Information', 'text', null, null, false, true, 30),
  ('Warehouse', 'connectivity', 'Connectivity', 'electronic', 'Electronic Information', 'text', null, null, false, true, 40),
  ('Warehouse', 'operating_system', 'Operating System', 'electronic', 'Electronic Information', 'text', null, null, false, true, 50),
  ('Warehouse', 'included_accessories', 'Included Accessories', 'electronic', 'Electronic Information', 'text', null, null, false, true, 60),
  -- Packaging
  ('Packaging', 'plastic_type', 'Plastic Type', 'plastic', 'Plastic Information', 'text', null, null, false, true, 10),
  ('Packaging', 'plastic_grade', 'Material Grade', 'plastic', 'Plastic Information', 'text', null, null, false, true, 20),
  ('Packaging', 'plastic_thickness', 'Thickness', 'plastic', 'Plastic Information', 'text', null, null, false, true, 30),
  ('Packaging', 'temperature_resistance', 'Temperature Resistance', 'plastic', 'Plastic Information', 'text', null, null, false, true, 40),
  ('Packaging', 'plastic_weight_capacity', 'Weight Capacity', 'plastic', 'Plastic Information', 'text', null, null, false, true, 50),
  -- Fabric & Clothing
  ('Fabric & Clothing', 'clothing_fabric', 'Fabric', 'clothing', 'Clothing & Fabric', 'text', null, null, false, true, 10),
  ('Fabric & Clothing', 'clothing_size', 'Available Sizes', 'clothing', 'Clothing & Fabric', 'multiline_list', null, null, false, true, 20),
  ('Fabric & Clothing', 'clothing_colour', 'Colour', 'clothing', 'Clothing & Fabric', 'text', null, null, false, true, 30),
  ('Fabric & Clothing', 'clothing_pattern', 'Pattern', 'clothing', 'Clothing & Fabric', 'text', null, null, false, true, 40),
  ('Fabric & Clothing', 'clothing_fit', 'Fit', 'clothing', 'Clothing & Fabric', 'text', null, null, false, true, 50),
  ('Fabric & Clothing', 'clothing_gsm', 'Fabric Weight', 'clothing', 'Clothing & Fabric', 'number', null, 'GSM', false, true, 60),
  ('Fabric & Clothing', 'clothing_wash_care', 'Care', 'clothing', 'Clothing & Fabric', 'text', null, null, false, true, 70),
  -- Appliances
  ('Appliances', 'appliance_power', 'Power', 'appliance', 'Appliance Information', 'text', null, null, false, true, 10),
  ('Appliances', 'appliance_voltage', 'Voltage', 'appliance', 'Appliance Information', 'text', null, null, false, true, 20),
  ('Appliances', 'appliance_capacity', 'Capacity', 'appliance', 'Appliance Information', 'text', null, null, false, true, 30),
  ('Appliances', 'energy_rating', 'Energy Rating', 'appliance', 'Appliance Information', 'text', null, null, false, true, 40)
) as v(cat_name, field_key, label, group_key, group_label, value_type, options, unit, is_required, is_customer_visible, sort_order)
where not exists (
  select 1 from public.attribute_definitions d
  join public.categories c on c.id = d.category_id
  where d.field_key = v.field_key and c.name = v.cat_name
);
-- ============================================================================
-- 8. Seed: demo furniture products (dining tables) and enrich existing
--    products with catalog, pricing, quality and delivery data.
-- ============================================================================
-- Reset seed-specific child rows so the migration can be re-run safely.
delete from public.product_price_history
where product_id in (select id from public.products where sku like 'FRN-%');
delete from public.product_images
where product_id in (select id from public.products where sku like 'FRN-%');
delete from public.product_variants
where product_id in (select id from public.products where sku like 'FRN-%');
delete from public.product_attribute_values
where product_id in (select id from public.products where sku like 'FRN-%');

insert into public.products (
  sku, name, description, short_description, detailed_description, key_features,
  brand, model, image_url, thumbnail_url, is_active,
  category_id, supplier_id,
  stock_quantity, reorder_level, unit_price, selling_price, mrp, tax_percent,
  quality_grade, "condition", quality_notes,
  warranty_period, warranty_type, warranty_provider, warranty_coverage, warranty_exclusions,
  care_instructions, safety_instructions,
  assembly_required, assembly_time, tools_required, assembly_service,
  length_cm, width_cm, height_cm, depth_cm,
  net_weight_kg, gross_weight_kg, load_capacity_kg, load_capacity_label,
  package_weight_kg, package_length_cm, package_width_cm, package_height_cm, package_contents,
  quantity_per_pack, quantity_unit,
  country_of_origin, material_sustainability, recycled_content, recyclable_packaging,
  wood_certification, eco_friendly_packaging,
  delivery_category, estimated_delivery
)
values
  (
    'FRN-TABLE-006', 'Premium Solid Sheesham Wood Dining Table',
    'A premium 6-seater dining table constructed from solid Sheesham wood with a natural matte finish.',
    'Premium 6-seater dining table in solid Sheesham wood with a natural matte finish.',
    'A premium 6-seater dining table constructed from solid Sheesham wood with a natural matte finish. The table features a reinforced wooden frame and sturdy joints designed for regular indoor dining use.' || E'\n\n' ||
    'The wood is selected for its strength, durability and natural grain pattern. The table has a smooth polished finish and a strong wooden frame designed for regular dining use. The surface is treated to improve resistance to everyday scratches and minor moisture exposure.' || E'\n\n' ||
    'The table is suitable for family dining areas, restaurants, offices and other indoor spaces.',
    array['Solid Sheesham Wood', 'Reinforced Frame', '6-Seater Design', 'Smooth Finish', 'Durable Construction', 'Easy Maintenance'],
    'ABC Furniture', 'DT-6-SHM',
    'https://placehold.co/900x600/8a5a2c/ffffff?text=Sheesham+Dining+Table',
    'https://placehold.co/300x300/8a5a2c/ffffff?text=DT-6',
    true,
    (select id from public.categories where name = 'Furniture'),
    (select id from public.suppliers where name = 'Northline Traders' limit 1),
    6, 3, 14500, 18999, 22999, 18,
    'Premium', 'New', 'Brand new factory stock, inspected before dispatch.',
    '2 Years', 'Manufacturer Warranty', 'ABC Furniture',
    'Manufacturing defects', 'Damage caused by misuse or unauthorized modification',
    array['Clean with a soft dry cloth', 'Avoid prolonged water exposure', 'Avoid harsh chemicals', 'Keep away from excessive moisture'],
    array['Do not exceed the maximum load', 'Ensure all legs are properly installed', 'Use on a stable and level surface'],
    true, '30-45 minutes', 'Basic screwdriver', 'Available',
    180, 90, 75, null,
    42, 47, 100, 'Maximum Load',
    47, 190, 100, 20,
    array['1 Dining Table', 'Assembly Hardware', 'Assembly Guide', 'Warranty Card'],
    1, 'Table',
    'India', 'Responsibly sourced hardwood', '30%', 'Recyclable cardboard', 'FSC', true,
    'LARGE', '2-3 Days'
  ),
(
    'FRN-TABLE-004', 'Sheesham Wood 4-Seater Dining Table',
    'Compact 4-seater dining table in solid Sheesham wood with a durable matte polish.',
    'Compact 4-seater dining table in solid Sheesham wood.',
    'A compact 4-seater dining table built from solid Sheesham wood with a smooth matte polish. The reinforced frame and braced legs make it suitable for smaller dining areas and offices.',
    array['Solid Sheesham Wood', 'Compact 4-Seater Design', 'Smooth Matte Finish', 'Reinforced Legs'],
    'ABC Furniture', 'DT-4-SHM',
    'https://placehold.co/900x600/9c6b33/ffffff?text=4+Seater+Table',
    'https://placehold.co/300x300/9c6b33/ffffff?text=DT-4',
    true,
    (select id from public.categories where name = 'Furniture'),
    (select id from public.suppliers where name = 'Northline Traders' limit 1),
    4, 2, 12000, 16999, 19999, 18,
    'Premium', 'New', 'Brand new factory stock.',
    '2 Years', 'Manufacturer Warranty', 'ABC Furniture',
    'Manufacturing defects', 'Damage caused by misuse or unauthorized modification',
    array['Clean with a soft dry cloth', 'Avoid prolonged water exposure', 'Avoid harsh chemicals'],
    array['Do not exceed the maximum load', 'Use on a stable and level surface'],
    true, '20-30 minutes', 'Basic screwdriver', 'Available',
    140, 80, 75, null,
    32, 36, 80, 'Maximum Load',
    36, 150, 90, 25,
    array['1 Dining Table', 'Assembly Hardware', 'Assembly Guide', 'Warranty Card'],
    1, 'Table',
    'India', 'Responsibly sourced hardwood', '30%', 'Recyclable cardboard', null, true,
    'MEDIUM', '2-3 Days'
  ),
  (
    'FRN-TABLE-008', 'Sheesham Wood 8-Seater Dining Table',
    'Spacious 8-seater dining table in solid Sheesham wood for larger family gatherings.',
    'Spacious 8-seater dining table in solid Sheesham wood.',
    'A spacious 8-seater dining table crafted from solid Sheesham wood. Heavy-duty construction with a thick tabletop and cross-braced frame makes it ideal for family homes, restaurants and banquets.',
    array['Solid Sheesham Wood', '8-Seater Design', 'Thick Tabletop', 'Heavy-Duty Frame'],
    'ABC Furniture', 'DT-8-SHM',
    'https://placehold.co/900x600/7a4d22/ffffff?text=8+Seater+Table',
    'https://placehold.co/300x300/7a4d22/ffffff?text=DT-8',
    true,
    (select id from public.categories where name = 'Furniture'),
    (select id from public.suppliers where name = 'Northline Traders' limit 1),
    2, 1, 16500, 21999, 25999, 18,
    'Premium', 'New', 'Brand new factory stock.',
    '2 Years', 'Manufacturer Warranty', 'ABC Furniture',
    'Manufacturing defects', 'Damage caused by misuse or unauthorized modification',
    array['Clean with a soft dry cloth', 'Avoid prolonged water exposure', 'Avoid harsh chemicals'],
    array['Do not exceed the maximum load', 'Ensure all legs are properly installed', 'Use on a stable and level surface'],
    true, '45-60 minutes', 'Basic screwdriver', 'Available',
    210, 95, 76, null,
    58, 64, 150, 'Maximum Load',
    64, 220, 105, 22,
    array['1 Dining Table', 'Assembly Hardware', 'Assembly Guide', 'Warranty Card'],
    1, 'Table',
    'India', 'Responsibly sourced hardwood', '30%', 'Recyclable cardboard', null, true,
    'LARGE', '2-3 Days'
  )
on conflict (sku) do update
set name = excluded.name,
    description = excluded.description,
    short_description = excluded.short_description,
    detailed_description = excluded.detailed_description,
    key_features = excluded.key_features,
    selling_price = excluded.selling_price,
    mrp = excluded.mrp,
    quality_grade = excluded.quality_grade,
    "condition" = excluded."condition",
    delivery_category = excluded.delivery_category,
    estimated_delivery = excluded.estimated_delivery,
    net_weight_kg = excluded.net_weight_kg,
    package_weight_kg = excluded.package_weight_kg;

-- Enrich the pre-existing demo products with pricing, quality and sale data
update public.products
set selling_price = coalesce(selling_price, unit_price),
    mrp = coalesce(mrp, unit_price * 1.20),
    quality_grade = 'Standard',
    "condition" = 'New',
    estimated_delivery = '1-2 Days',
    delivery_category = case
      when sku in ('OFF-CHAIR-002') then 'MEDIUM'
      else 'SMALL'
    end
where sku in ('ELC-USB-C-001', 'OFF-CHAIR-002', 'WRH-SCANNER-003', 'PKG-TAPE-004', 'OFF-PAPER-005');
-- ============================================================================
-- 9. Seed: product-specific attribute values (dynamic / category specific)
-- ============================================================================
insert into public.product_attribute_values (product_id, definition_id, value)
select p.id, d.id,
  case when v.vtype = 'str' then to_jsonb(v.value) else v.value::jsonb end
from (values
  -- Premium Solid Sheesham Wood Dining Table (FRN-TABLE-006)
  ('FRN-TABLE-006', null, 'primary_colour', 'str', 'Natural Brown'),
  ('FRN-TABLE-006', null, 'available_colours', 'json', '["Natural Brown","Walnut","Dark Brown"]'),
  ('FRN-TABLE-006', null, 'colour_finish', 'str', 'Matte'),
  ('FRN-TABLE-006', null, 'finish_type', 'str', 'Natural Matte Finish'),
  ('FRN-TABLE-006', null, 'surface_treatment', 'str', 'Smooth polished surface'),
  ('FRN-TABLE-006', null, 'coating', 'str', 'Protective wood coating'),
  ('FRN-TABLE-006', null, 'surface_texture', 'str', 'Natural wood grain'),
  ('FRN-TABLE-006', null, 'expected_usage', 'str', 'Regular indoor dining use'),
  ('FRN-TABLE-006', null, 'construction_quality', 'str', 'Heavy-duty solid wood frame'),
  ('FRN-TABLE-006', null, 'material_durability', 'str', 'Solid hardwood, long life'),
  ('FRN-TABLE-006', null, 'scratch_resistance', 'str', 'Suitable for normal household use'),
  ('FRN-TABLE-006', null, 'water_resistance', 'str', 'Moderate'),
  ('FRN-TABLE-006', null, 'heat_resistance', 'str', 'Low'),
  ('FRN-TABLE-006', null, 'rust_resistance', 'str', 'Not Applicable'),
  ('FRN-TABLE-006', null, 'uv_resistance', 'str', 'No'),
  -- Furniture-specific attributes
  ('FRN-TABLE-006', 'Furniture', 'primary_material', 'str', 'Solid Sheesham Wood'),
  ('FRN-TABLE-006', 'Furniture', 'material_type', 'str', 'Solid Wood'),
  ('FRN-TABLE-006', 'Furniture', 'material_quality', 'str', 'Premium Grade'),
  ('FRN-TABLE-006', 'Furniture', 'material_percentage', 'str', '100% Solid Wood'),
  ('FRN-TABLE-006', 'Furniture', 'secondary_materials', 'str', 'Metal fittings and fasteners'),
  ('FRN-TABLE-006', 'Furniture', 'surface_finish', 'str', 'Natural Matte Polish'),
  ('FRN-TABLE-006', 'Furniture', 'construction_type', 'str', 'Solid wood frame with reinforced joints'),
  ('FRN-TABLE-006', 'Furniture', 'wood_type', 'str', 'Sheesham Wood'),
  ('FRN-TABLE-006', 'Furniture', 'wood_grade', 'str', 'Premium Grade'),
  ('FRN-TABLE-006', 'Furniture', 'wood_quality', 'str', 'Premium Grade'),
  ('FRN-TABLE-006', 'Furniture', 'wood_content', 'str', '100% Solid Wood'),
  ('FRN-TABLE-006', 'Furniture', 'moisture_treatment', 'str', 'Kiln-dried and moisture treated'),
  ('FRN-TABLE-006', 'Furniture', 'wood_finish', 'str', 'Natural Polish'),
  ('FRN-TABLE-006', 'Furniture', 'frame_material', 'str', 'Solid Sheesham Wood'),
  ('FRN-TABLE-006', 'Furniture', 'joint_type', 'str', 'Reinforced Wooden Joints'),
  ('FRN-TABLE-006', 'Furniture', 'hardware_material', 'str', 'Steel Fasteners'),
  ('FRN-TABLE-006', 'Furniture', 'seating_capacity', 'json', '6'),
  ('FRN-TABLE-006', 'Furniture', 'maximum_user_weight', 'str', '100 kg'),
  ('FRN-TABLE-006', 'Furniture', 'metal_type', 'str', 'Steel'),
  ('FRN-TABLE-006', 'Furniture', 'metal_grade', 'str', 'Mild Steel'),
  ('FRN-TABLE-006', 'Furniture', 'corrosion_resistance', 'str', 'Moderate'),
  -- 4-Seater (FRN-TABLE-004)
  ('FRN-TABLE-004', null, 'primary_colour', 'str', 'Natural Brown'),
  ('FRN-TABLE-004', null, 'available_colours', 'json', '["Natural Brown","Walnut"]'),
  ('FRN-TABLE-004', null, 'finish_type', 'str', 'Natural Matte Finish'),
  ('FRN-TABLE-004', null, 'water_resistance', 'str', 'Moderate'),
  ('FRN-TABLE-004', null, 'rust_resistance', 'str', 'Not Applicable'),
  ('FRN-TABLE-004', null, 'scratch_resistance', 'str', 'Suitable for normal household use'),
  ('FRN-TABLE-004', 'Furniture', 'primary_material', 'str', 'Solid Sheesham Wood'),
  ('FRN-TABLE-004', 'Furniture', 'wood_type', 'str', 'Sheesham Wood'),
  ('FRN-TABLE-004', 'Furniture', 'wood_quality', 'str', 'Premium Grade'),
  ('FRN-TABLE-004', 'Furniture', 'wood_content', 'str', '100% Solid Wood'),
  ('FRN-TABLE-004', 'Furniture', 'frame_material', 'str', 'Solid Sheesham Wood'),
  ('FRN-TABLE-004', 'Furniture', 'joint_type', 'str', 'Reinforced Wooden Joints'),
  ('FRN-TABLE-004', 'Furniture', 'hardware_material', 'str', 'Steel Fasteners'),
  ('FRN-TABLE-004', 'Furniture', 'seating_capacity', 'json', '4'),
  -- 8-Seater (FRN-TABLE-008)
  ('FRN-TABLE-008', null, 'primary_colour', 'str', 'Walnut'),
  ('FRN-TABLE-008', null, 'available_colours', 'json', '["Walnut","Dark Brown"]'),
  ('FRN-TABLE-008', null, 'finish_type', 'str', 'Natural Matte Finish'),
  ('FRN-TABLE-008', null, 'water_resistance', 'str', 'Moderate'),
  ('FRN-TABLE-008', null, 'rust_resistance', 'str', 'Not Applicable'),
  ('FRN-TABLE-008', 'Furniture', 'primary_material', 'str', 'Solid Sheesham Wood'),
  ('FRN-TABLE-008', 'Furniture', 'wood_type', 'str', 'Sheesham Wood'),
  ('FRN-TABLE-008', 'Furniture', 'wood_quality', 'str', 'Premium Grade'),
  ('FRN-TABLE-008', 'Furniture', 'wood_content', 'str', '100% Solid Wood'),
  ('FRN-TABLE-008', 'Furniture', 'frame_material', 'str', 'Solid Sheesham Wood'),
  ('FRN-TABLE-008', 'Furniture', 'joint_type', 'str', 'Reinforced Wooden Joints'),
  ('FRN-TABLE-008', 'Furniture', 'seating_capacity', 'json', '8')
) as v(sku, cat, field_key, vtype, value)
join public.products p on p.sku = v.sku
join public.attribute_definitions d on d.field_key = v.field_key
  and (
    (v.cat is null and d.category_id is null)
    or (v.cat is not null and d.category_id = (select id from public.categories where name = v.cat))
  )
on conflict (product_id, definition_id) do update
set value = excluded.value;
-- Ergonomic Task Chair (OFF-CHAIR-002) - fabric + metal attributes
insert into public.product_attribute_values (product_id, definition_id, value)
select p.id, d.id,
  case when v.vtype = 'str' then to_jsonb(v.value) else v.value::jsonb end
from (values
  ('OFF-CHAIR-002', null, 'primary_colour', 'str', 'Dark Grey'),
  ('OFF-CHAIR-002', null, 'available_colours', 'json', '["Dark Grey","Black"]'),
  ('OFF-CHAIR-002', null, 'finish_type', 'str', 'Powder-coated'),
  ('OFF-CHAIR-002', null, 'expected_usage', 'str', 'Daily office seating'),
  ('OFF-CHAIR-002', null, 'water_resistance', 'str', 'Moderate'),
  ('OFF-CHAIR-002', null, 'scratch_resistance', 'str', 'Suitable for normal office use'),
  ('OFF-CHAIR-002', 'Office Supplies', 'fabric_type', 'str', 'Polyester Upholstery Fabric'),
  ('OFF-CHAIR-002', 'Office Supplies', 'fabric_material', 'str', 'Polyester'),
  ('OFF-CHAIR-002', 'Office Supplies', 'fabric_composition', 'str', '60% Polyester, 40% Cotton'),
  ('OFF-CHAIR-002', 'Office Supplies', 'fabric_quality', 'str', 'Premium Upholstery Grade'),
  ('OFF-CHAIR-002', 'Office Supplies', 'fabric_gsm', 'json', '320'),
  ('OFF-CHAIR-002', 'Office Supplies', 'fabric_colour', 'str', 'Dark Grey'),
  ('OFF-CHAIR-002', 'Office Supplies', 'fabric_texture', 'str', 'Soft woven texture'),
  ('OFF-CHAIR-002', 'Office Supplies', 'fabric_cleaning', 'str', 'Wipe with a soft damp cloth'),
  ('OFF-CHAIR-002', 'Office Supplies', 'metal_type', 'str', 'Steel'),
  ('OFF-CHAIR-002', 'Office Supplies', 'metal_grade', 'str', 'Powder-coated Mild Steel'),
  ('OFF-CHAIR-002', 'Office Supplies', 'metal_thickness', 'str', '2.0 mm'),
  ('OFF-CHAIR-002', 'Office Supplies', 'corrosion_resistance', 'str', 'High')
) as v(sku, cat, field_key, vtype, value)
join public.products p on p.sku = v.sku
join public.attribute_definitions d on d.field_key = v.field_key
  and (
    (v.cat is null and d.category_id is null)
    or (v.cat is not null and d.category_id = (select id from public.categories where name = v.cat))
  )
on conflict (product_id, definition_id) do update
set value = excluded.value;

-- Barcode Scanner (WRH-SCANNER-003) - electronic attributes
insert into public.product_attribute_values (product_id, definition_id, value)
select p.id, d.id,
  case when v.vtype = 'str' then to_jsonb(v.value) else v.value::jsonb end
from (values
  ('WRH-SCANNER-003', null, 'primary_colour', 'str', 'Black'),
  ('WRH-SCANNER-003', null, 'finish_type', 'str', 'Matte'),
  ('WRH-SCANNER-003', null, 'expected_usage', 'str', 'Warehouse receiving and dispatch'),
  ('WRH-SCANNER-003', null, 'water_resistance', 'str', 'Moderate'),
  ('WRH-SCANNER-003', 'Warehouse', 'processor', 'str', 'ARM-based embedded'),
  ('WRH-SCANNER-003', 'Warehouse', 'connectivity', 'str', 'USB, Bluetooth'),
  ('WRH-SCANNER-003', 'Warehouse', 'operating_system', 'str', 'Proprietary firmware'),
  ('WRH-SCANNER-003', 'Warehouse', 'included_accessories', 'str', 'USB cable, stand')
) as v(sku, cat, field_key, vtype, value)
join public.products p on p.sku = v.sku
join public.attribute_definitions d on d.field_key = v.field_key
  and (
    (v.cat is null and d.category_id is null)
    or (v.cat is not null and d.category_id = (select id from public.categories where name = v.cat))
  )
on conflict (product_id, definition_id) do update
set value = excluded.value;

-- USB-C Docking Station (ELC-USB-C-001) - electronic attributes
insert into public.product_attribute_values (product_id, definition_id, value)
select p.id, d.id,
  case when v.vtype = 'str' then to_jsonb(v.value) else v.value::jsonb end
from (values
  ('ELC-USB-C-001', null, 'primary_colour', 'str', 'Grey'),
  ('ELC-USB-C-001', null, 'finish_type', 'str', 'Matte'),
  ('ELC-USB-C-001', null, 'expected_usage', 'str', 'Workstation connectivity'),
  ('ELC-USB-C-001', 'Electronics', 'connectivity', 'str', 'USB-C, HDMI, DisplayPort, Gigabit Ethernet'),
  ('ELC-USB-C-001', 'Electronics', 'power_rating', 'str', '100W USB-C Power Delivery'),
  ('ELC-USB-C-001', 'Electronics', 'included_accessories', 'str', 'Power adapter, cable')
) as v(sku, cat, field_key, vtype, value)
join public.products p on p.sku = v.sku
join public.attribute_definitions d on d.field_key = v.field_key
  and (
    (v.cat is null and d.category_id is null)
    or (v.cat is not null and d.category_id = (select id from public.categories where name = v.cat))
  )
on conflict (product_id, definition_id) do update
set value = excluded.value;

-- Heavy Duty Packing Tape (PKG-TAPE-004) and A4 Paper (OFF-PAPER-005)
insert into public.product_attribute_values (product_id, definition_id, value)
select p.id, d.id,
  case when v.vtype = 'str' then to_jsonb(v.value) else v.value::jsonb end
from (values
  ('PKG-TAPE-004', null, 'primary_colour', 'str', 'Clear'),
  ('PKG-TAPE-004', 'Packaging', 'plastic_type', 'str', 'Polypropylene (BOPP)'),
  ('PKG-TAPE-004', 'Packaging', 'plastic_grade', 'str', 'Industrial Grade'),
  ('PKG-TAPE-004', 'Packaging', 'plastic_thickness', 'str', '48 micron'),
  ('OFF-PAPER-005', null, 'primary_colour', 'str', 'White')
) as v(sku, cat, field_key, vtype, value)
join public.products p on p.sku = v.sku
join public.attribute_definitions d on d.field_key = v.field_key
  and (
    (v.cat is null and d.category_id is null)
    or (v.cat is not null and d.category_id = (select id from public.categories where name = v.cat))
  )
on conflict (product_id, definition_id) do update
set value = excluded.value;
-- ============================================================================
-- 10. Seed: variants, images and price history for the dining table
-- ============================================================================
insert into public.product_variants (
  product_id, label, sku, colour, size, selling_price, mrp, stock_quantity,
  net_weight_kg, length_cm, width_cm, height_cm, is_active, sort_order
)
select
  p.id, v.label, v.variant_sku, v.colour, v.size, v.selling_price, v.mrp, v.stock_quantity,
  v.net_weight_kg, v.length_cm, v.width_cm, v.height_cm, true, v.sort_order
from (values
  ('FRN-TABLE-006', 'Natural Brown', 'FRN-TABLE-006-BRN', 'Natural Brown', '6 Seater', 18999, 22999, 6, 42, 180, 90, 75, 1),
  ('FRN-TABLE-006', 'Walnut', 'FRN-TABLE-006-WLN', 'Walnut', '6 Seater', 19999, 23999, 3, 42, 180, 90, 75, 2),
  ('FRN-TABLE-006', 'Dark Brown', 'FRN-TABLE-006-DRK', 'Dark Brown', '6 Seater', 19499, 23499, 4, 43, 180, 90, 75, 3)
) as v(sku, label, variant_sku, colour, size, selling_price, mrp, stock_quantity, net_weight_kg, length_cm, width_cm, height_cm, sort_order)
join public.products p on p.sku = v.sku
on conflict (product_id, sku) do update
set label = excluded.label,
    colour = excluded.colour,
    size = excluded.size,
    selling_price = excluded.selling_price,
    mrp = excluded.mrp,
    stock_quantity = excluded.stock_quantity,
    net_weight_kg = excluded.net_weight_kg,
    length_cm = excluded.length_cm,
    width_cm = excluded.width_cm,
    height_cm = excluded.height_cm,
    sort_order = excluded.sort_order;

insert into public.product_images (product_id, variant_id, url, alt_text, sort_order)
select
  p.id, vv.id, m.url, m.alt_text, m.sort_order
from (values
  ('FRN-TABLE-006', 'FRN-TABLE-006-BRN', 1, 'https://placehold.co/900x600/8a5a2c/ffffff?text=Natural+Brown', 'Dining table in Natural Brown finish'),
  ('FRN-TABLE-006', 'FRN-TABLE-006-WLN', 2, 'https://placehold.co/900x600/6b4423/ffffff?text=Walnut', 'Dining table in Walnut finish'),
  ('FRN-TABLE-006', 'FRN-TABLE-006-DRK', 3, 'https://placehold.co/900x600/4f3216/ffffff?text=Dark+Brown', 'Dining table in Dark Brown finish'),
  ('FRN-TABLE-006', null, 4, 'https://placehold.co/900x600/5c6d68/ffffff?text=Detail+Joints', 'Reinforced joint close-up'),
  ('FRN-TABLE-006', null, 5, 'https://placehold.co/900x600/77806d/ffffff?text=Top+View', 'Tabletop surface view')
) as m(sku, variant_sku, sort_order, url, alt_text)
join public.products p on p.sku = m.sku
left join public.product_variants vv on vv.product_id = p.id and vv.sku = m.variant_sku;

insert into public.product_price_history (product_id, price, price_type, note, recorded_at)
select p.id, h.price, h.price_type, h.note, h.recorded_at
from (values
  ('FRN-TABLE-006', 18999, 'selling', 'Current selling price', now()),
  ('FRN-TABLE-006', 19499, 'selling', 'Price reduced', now() - interval '21 days'),
  ('FRN-TABLE-006', 19999, 'selling', 'Introductory price', now() - interval '60 days'),
  ('FRN-TABLE-006', 22999, 'mrp', 'Listed MRP', now()),
  ('FRN-TABLE-004', 16999, 'selling', 'Current selling price', now()),
  ('FRN-TABLE-008', 21999, 'selling', 'Current selling price', now())
) as h(sku, price, price_type, note, recorded_at)
join public.products p on p.sku = h.sku
on conflict do nothing;
-- ============================================================================
-- 11. Seed: sample customer purchase request
-- ============================================================================
insert into public.purchase_requests (
  product_id, variant_id, customer_name, customer_email, customer_phone,
  delivery_address, city, pincode, notes, status, admin_note, status_history
)
select
  p.id, vv.id, 'Priya Sharma', 'priya.sharma@example.com', '+91 98765 12345',
  '12, MG Road, Indiranagar', 'Bengaluru', '560038',
  'Please call before delivery.', 'pending', null,
(  '[{"status":"pending","at":"' || now()::text || '"}]')::jsonb
from public.products p
left join public.product_variants vv
  on vv.product_id = p.id and vv.sku = 'FRN-TABLE-006-BRN'
where p.sku = 'FRN-TABLE-006'
  and not exists (
    select 1 from public.purchase_requests r
    where r.customer_email = 'priya.sharma@example.com' and r.product_id = p.id
  );

notify pgrst, 'reload schema';
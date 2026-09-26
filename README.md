# StockSense · Inventory & Product Catalog

React + Vite storefront and admin dashboard backed by Supabase PostgreSQL
migrations.

## Features

- **Customer catalog** (`#/catalog`) with barcode/SKU scan entry, product cards
  and category filters.
- **Customer product page** (`#/product/:sku-or-id`) showing, in priority order:
  images, name, price (selling / MRP / discount), availability, short
  description, key features, **Material & Quality**, product-specific groups
  (Wood / Fabric / Leather / Metal / Plastic / Electronic / Durability /
  Finish / Colour), physical specifications, dimensions & weight, warranty,
  package contents, care & safety, assembly, origin, environmental info,
  **price analysis** and **similar products** — followed by a
  **Buy / Request Purchase** flow.
- **Dynamic, category-specific attributes** — the admin defines which fields a
  category uses; the product form only shows fields applicable to that category.
- **Request purchase pipeline** — customers submit product + delivery details;
  admins review and move requests through
  `pending → info_required → confirmed → preparing → out_for_delivery → delivered`.
- **Variants** — colour/size variants with their own SKU, price, stock, weight
  and images; selecting a variant updates the customer page in real time.
- **Data rule** — every specification comes from the product database; missing
  values render as *"Information not provided"* and empty sections are hidden.

## Demo Admin Credentials

- Email: `admin@inventory.test`
- Password: `Admin@12345`

The app ships with complete demo mode (no Supabase keys required). Demo data is
seeded in `src/data/demoData.js`, including a full
**Premium Solid Sheesham Wood Dining Table** example.

## Run Locally

```bash
npm install
npm run dev
```

## Supabase Setup

Apply the migrations in `supabase/migrations/` in order with the Supabase CLI
or SQL editor:

1. `202605150001_inventory_management_system.sql` — base schema + seeds + admin.
2. `202605150002_refresh_admin_auth_rpc.sql` — admin authentication helper.
3. `202605260001_product_catalog_enhancement.sql` — product catalog enhancement:
   structured product fields (pricing, quality, warranty, dimensions, weights,
   delivery, package), dynamic `attribute_definitions` +
   `product_attribute_values`, `product_variants`, `product_images`,
   `product_price_history`, `purchase_requests`, RLS policies, and a catalogue
   of demo furniture/electronics/fabric data.

```bash
supabase db push
```

Until migration 3 is applied to the connected Supabase project, all catalog and
purchase-request features automatically run against the seeded local demo data.

All three migrations were validated against a fresh PostgreSQL 16 instance
(correct seed counts, RLS, and the request-status RPC).


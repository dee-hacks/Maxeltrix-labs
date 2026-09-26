import { supabase, hasSupabaseConfig } from '../lib/supabase';
import {
  demoAttributeDefinitions,
  demoCategories,
  demoProducts,
} from '../data/demoData';

function isMissingSupabaseSchema(error) {
  return (
    error?.code === 'PGRST202' ||
    error?.code === '42P01' ||
    error?.message?.includes('schema cache') ||
    error?.message?.includes('does not exist')
  );
}

/*
 * The enhanced catalog (attributes, variants, price history, purchase
 * requests) requires the schema created by migration
 * 202605260001_product_catalog_enhancement.sql. Until that migration has
 * been applied to the connected Supabase project, all catalog features run
 * against the fully-seeded local demo data.
 */
let catalogCapabilityPromise = null;
function supportsCatalog() {
  if (!hasSupabaseConfig) return Promise.resolve(false);
  if (!catalogCapabilityPromise) {
    catalogCapabilityPromise = supabase
      .from('attribute_definitions')
      .select('id')
      .limit(1)
      .then((result) => !result.error)
      .catch(() => false);
  }
  return catalogCapabilityPromise;
}

/* ------------------------------------------------------------------ */
/* Demo-mode helpers                                                    */
/* ------------------------------------------------------------------ */
function findDemoProduct(idOrSku) {
  return demoProducts.find((p) => p.id === idOrSku || p.sku === idOrSku) ?? null;
}

function normalizeDemoDefinitions(categoryId) {
  return demoAttributeDefinitions.filter(
    (d) =>
      d.is_active &&
      (d.category_id === null || d.category_id === undefined || d.category_id === categoryId),
  );
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */
export async function loadCategories() {
  if (!(await supportsCatalog())) return demoCategories;

  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (isMissingSupabaseSchema(error)) return demoCategories;
  if (error) throw error;
  return data;
}

export async function loadAttributeDefinitions(categoryId) {
  if (!(await supportsCatalog())) return normalizeDemoDefinitions(categoryId);

  let query = supabase
    .from('attribute_definitions')
    .select('*')
    .eq('is_active', true)
    .order('group_key')
    .order('sort_order');

  if (categoryId) {
    query = query.or(`category_id.eq.${categoryId},category_id.is.null`);
  } else {
    query = query.is('category_id', null);
  }

  const { data, error } = await query;
  if (isMissingSupabaseSchema(error)) return normalizeDemoDefinitions(categoryId);
  if (error) throw error;
  return data;
}

export async function loadProducts(options = {}) {
  const { activeOnly = false } = options;

  if (!(await supportsCatalog())) {
    return activeOnly ? demoProducts.filter((p) => p.is_active) : [...demoProducts];
  }

  let query = supabase
    .from('products')
    .select('*, categories(name), suppliers(name)');

  if (activeOnly) query = query.eq('is_active', true);
  query = query.order('name');

  const { data, error } = await query;
  if (isMissingSupabaseSchema(error)) {
    return activeOnly ? demoProducts.filter((p) => p.is_active) : [...demoProducts];
  }
  if (error) throw error;
  return data;
}
export async function loadProduct(idOrSku) {
  if (!(await supportsCatalog())) return findDemoProduct(idOrSku);

  let product = null;
  let error = null;

  for (const field of ['id', 'sku']) {
    if (product) break;
    const res = await supabase
      .from('products')
      .select('*, categories(name), suppliers(name)')
      .eq(field, idOrSku)
      .maybeSingle();
    if (!res.error) {
      product = res.data;
    } else {
      error = res.error;
    }
  }

  if (!product) {
    if (isMissingSupabaseSchema(error)) return findDemoProduct(idOrSku);
    throw error;
  }

  const [attrRes, variantRes, imageRes, historyRes] = await Promise.all([
    supabase
      .from('product_attribute_values')
      .select('*, attribute_definitions(*)')
      .eq('product_id', product.id),
    supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', product.id)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('product_images')
      .select('*')
      .eq('product_id', product.id)
      .order('sort_order'),
    supabase
      .from('product_price_history')
      .select('*')
      .eq('product_id', product.id)
      .order('recorded_at', { ascending: false }),
  ]);

  if (isMissingSupabaseSchema(attrRes.error)) return findDemoProduct(idOrSku);
  for (const res of [attrRes, variantRes, imageRes, historyRes]) {
    if (res.error) throw res.error;
  }

  const attributes = (attrRes.data ?? []).map((row) => {
    const def = row.attribute_definitions ?? {};
    return {
      id: row.id,
      definition_id: row.definition_id,
      field_key: def.field_key ?? '',
      label: def.label ?? '',
      group_key: def.group_key ?? 'specifications',
      group_label: def.group_label ?? 'Specifications',
      value: row.value,
      value_type: def.value_type ?? 'text',
      unit: def.unit ?? null,
      is_customer_visible: def.is_customer_visible ?? true,
      sort_order: def.sort_order ?? 0,
    };
  });

  return {
    ...product,
    attributes,
    variants: variantRes.data ?? [],
    images: imageRes.data ?? [],
    price_history: historyRes.data ?? [],
  };
}
export async function saveProduct(payload) {
  const normalized = {
    sku: payload.sku,
    name: payload.name,
    description: payload.description ?? payload.short_description ?? '',
    short_description: payload.short_description ?? '',
    detailed_description: payload.detailed_description ?? '',
    key_features: payload.key_features ?? [],
    brand: payload.brand ?? null,
    model: payload.model ?? null,
    barcode: payload.barcode ?? null,
    image_url: payload.image_url ?? null,
    thumbnail_url: payload.thumbnail_url ?? null,
    category_id: payload.category_id ?? null,
    supplier_id: payload.supplier_id ?? null,
    stock_quantity: Number(payload.stock_quantity ?? 0),
    reorder_level: Number(payload.reorder_level ?? 0),
    unit_price: Number(payload.unit_price ?? 0),
    selling_price: Number(payload.selling_price ?? payload.unit_price ?? 0),
    mrp: Number(payload.mrp ?? payload.selling_price ?? 0),
    tax_percent: Number(payload.tax_percent ?? 0),
    quality_grade: payload.quality_grade ?? null,
    condition: payload.condition ?? 'New',
    quality_notes: payload.quality_notes ?? null,
    warranty_period: payload.warranty_period ?? null,
    warranty_type: payload.warranty_type ?? null,
    warranty_provider: payload.warranty_provider ?? null,
    warranty_coverage: payload.warranty_coverage ?? null,
    warranty_exclusions: payload.warranty_exclusions ?? null,
    care_instructions: payload.care_instructions ?? [],
    safety_instructions: payload.safety_instructions ?? [],
    assembly_required: Boolean(payload.assembly_required),
    assembly_time: payload.assembly_time ?? null,
    tools_required: payload.tools_required ?? null,
    assembly_service: payload.assembly_service ?? null,
    length_cm: payload.length_cm ? Number(payload.length_cm) : null,
    width_cm: payload.width_cm ? Number(payload.width_cm) : null,
    height_cm: payload.height_cm ? Number(payload.height_cm) : null,
    depth_cm: payload.depth_cm ? Number(payload.depth_cm) : null,
    net_weight_kg: payload.net_weight_kg ? Number(payload.net_weight_kg) : null,
    gross_weight_kg: payload.gross_weight_kg ? Number(payload.gross_weight_kg) : null,
    load_capacity_kg: payload.load_capacity_kg ? Number(payload.load_capacity_kg) : null,
    load_capacity_label: payload.load_capacity_label ?? null,
    package_weight_kg: payload.package_weight_kg ? Number(payload.package_weight_kg) : null,
    package_length_cm: payload.package_length_cm ? Number(payload.package_length_cm) : null,
    package_width_cm: payload.package_width_cm ? Number(payload.package_width_cm) : null,
    package_height_cm: payload.package_height_cm ? Number(payload.package_height_cm) : null,
    package_contents: payload.package_contents ?? [],
    quantity_per_pack: payload.quantity_per_pack ? Number(payload.quantity_per_pack) : null,
    quantity_unit: payload.quantity_unit ?? null,
    country_of_origin: payload.country_of_origin ?? null,
    material_sustainability: payload.material_sustainability ?? null,
    recycled_content: payload.recycled_content ?? null,
    recyclable_packaging: payload.recyclable_packaging ?? null,
    wood_certification: payload.wood_certification ?? null,
    eco_friendly_packaging: Boolean(payload.eco_friendly_packaging),
    delivery_category: payload.delivery_category ?? null,
    estimated_delivery: payload.estimated_delivery ?? null,
    is_active: payload.is_active !== false,
  };

  if (!(await supportsCatalog())) {
    return saveDemoProduct(payload, normalized);
  }
const { data: saved, error: productError } = await supabase
    .from('products')
    .upsert(normalized, { onConflict: 'sku' })
    .select('id, sku')
    .single();
  if (productError) throw productError;
  const productId = saved.id;

  const { error: deleteAttrError } = await supabase
    .from('product_attribute_values')
    .delete()
    .eq('product_id', productId);
  if (deleteAttrError) throw deleteAttrError;

  const attrRows = (payload.attributes ?? [])
    .filter((a) => a.definition_id && a.value !== '' && a.value !== null && a.value !== undefined)
    .map((a) => ({ product_id: productId, definition_id: a.definition_id, value: a.value }));
  if (attrRows.length) {
    const { error: attrError } = await supabase
      .from('product_attribute_values')
      .insert(attrRows);
    if (attrError) throw attrError;
  }

  const { error: deleteVariantError } = await supabase
    .from('product_variants')
    .delete()
    .eq('product_id', productId);
  if (deleteVariantError) throw deleteVariantError;

  const variantRows = (payload.variants ?? []).map((v, index) => ({
    product_id: productId,
    label: v.label ?? v.colour ?? v.size ?? `Variant ${index + 1}`,
    sku: v.sku,
    colour: v.colour ?? null,
    size: v.size ?? null,
    selling_price: Number(v.selling_price ?? payload.selling_price ?? 0),
    mrp: Number(v.mrp ?? payload.mrp ?? 0),
    stock_quantity: Number(v.stock_quantity ?? 0),
    net_weight_kg: v.net_weight_kg ? Number(v.net_weight_kg) : null,
    length_cm: v.length_cm ? Number(v.length_cm) : null,
    width_cm: v.width_cm ? Number(v.width_cm) : null,
    height_cm: v.height_cm ? Number(v.height_cm) : null,
    is_active: v.is_active !== false,
    sort_order: index + 1,
  }));
  if (variantRows.length) {
    const { error: variantError } = await supabase.from('product_variants').insert(variantRows);
    if (variantError) throw variantError;
  }

  const { error: deleteImageError } = await supabase
    .from('product_images')
    .delete()
    .eq('product_id', productId);
  if (deleteImageError) throw deleteImageError;

  const imageRows = (payload.images ?? [])
    .filter((img) => img.url)
    .map((img, index) => ({
      product_id: productId,
      url: img.url,
      alt_text: img.alt_text ?? payload.name ?? null,
      sort_order: img.sort_order ?? index + 1,
    }));
  if (imageRows.length) {
    const { error: imageError } = await supabase.from('product_images').insert(imageRows);
    if (imageError) throw imageError;
  }

  return saved;
}
function saveDemoProduct(payload, normalized) {
  const category = demoCategories.find((c) => c.id === normalized.category_id);
  const merged = {
    ...normalized,
    categories: category ? { name: category.name } : null,
    suppliers: null,
    attributes: payload.attributes ?? [],
    variants: payload.variants ?? [],
    images: payload.images ?? [],
    price_history: payload.price_history ?? [],
  };

  if (payload.id) {
    const index = demoProducts.findIndex((p) => p.id === payload.id);
    if (index >= 0) {
      demoProducts[index] = { ...demoProducts[index], ...merged };
      return { id: payload.id, sku: payload.sku };
    }
  }

  const newId = `prd-${Date.now()}`;
  demoProducts.push({ ...merged, id: newId });
  return { id: newId, sku: payload.sku };
}

export async function saveAttributeDefinition(definition) {
  if (!(await supportsCatalog())) {
    const index = demoAttributeDefinitions.findIndex((d) => d.id === definition.id);
    if (index >= 0) {
      demoAttributeDefinitions[index] = { ...demoAttributeDefinitions[index], ...definition };
    } else {
      definition.id = `def-${definition.category_id ?? 'global'}-${definition.field_key}`;
      demoAttributeDefinitions.push(definition);
    }
    return definition;
  }
const row = {
    category_id: definition.category_id ?? null,
    field_key: definition.field_key,
    label: definition.label,
    group_key: definition.group_key ?? 'specifications',
    group_label: definition.group_label ?? 'Specifications',
    value_type: definition.value_type ?? 'text',
    options: definition.options ?? null,
    unit: definition.unit ?? null,
    is_required: Boolean(definition.is_required),
    is_customer_visible: definition.is_customer_visible !== false,
    sort_order: Number(definition.sort_order ?? 0),
    is_active: definition.is_active !== false,
  };
  const { data, error } = await supabase
    .from('attribute_definitions')
    .upsert(row, { onConflict: 'category_id,field_key' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
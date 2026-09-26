import { supabase, hasSupabaseConfig } from '../lib/supabase';
import {
  demoCategories,
  demoCredentials,
  demoMovements,
  demoProducts,
  demoPurchaseRequests,
  demoSuppliers,
} from '../data/demoData';

function isSeededDemoAdmin(email, password) {
  return email === demoCredentials.email && password === demoCredentials.password;
}

function isMissingSupabaseSchema(error) {
  return (
    error?.code === 'PGRST202' ||
    error?.code === '42P01' ||
    error?.message?.includes('schema cache') ||
    error?.message?.includes('does not exist')
  );
}

function getDemoAdmin(email) {
  return {
    id: 'demo-admin',
    full_name: 'Demo Administrator',
    email,
    isDemoMode: true,
  };
}

function getDemoDashboardData() {
  return {
    products: demoProducts,
    categories: demoCategories,
    suppliers: demoSuppliers,
    movements: demoMovements,
  };
}

/* The purchase pipeline requires the enhanced schema (migration
   202605260001_product_catalog_enhancement.sql). Fall back to the seeded
   demo pipeline until that migration is applied to the Supabase project. */
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

export async function signInAdmin(email, password) {
  if (!hasSupabaseConfig) {
    if (isSeededDemoAdmin(email, password)) {
      return getDemoAdmin(email);
    }
    throw new Error('Invalid demo credentials.');
  }

  const { data, error } = await supabase.rpc('authenticate_admin', {
    login_email: email,
    login_password: password,
  });

  if (error) {
    if (isMissingSupabaseSchema(error) && isSeededDemoAdmin(email, password)) {
      return getDemoAdmin(email);
    }

    throw error;
  }
  if (!data?.length) throw new Error('Invalid admin credentials.');
  return data[0];
}

export async function loadDashboardData() {
  if (!hasSupabaseConfig) {
    return getDemoDashboardData();
  }

  const [products, categories, suppliers, movements] = await Promise.all([
    supabase
      .from('products')
      .select('*, categories(name), suppliers(name)')
      .order('name'),
    supabase.from('categories').select('*').order('name'),
    supabase.from('suppliers').select('*').order('name'),
    supabase
      .from('stock_movements')
      .select('*, products(name, sku)')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  for (const response of [products, categories, suppliers, movements]) {
    if (isMissingSupabaseSchema(response.error)) {
      return getDemoDashboardData();
    }

    if (response.error) throw response.error;
  }

  return {
    products: products.data,
    categories: categories.data,
    suppliers: suppliers.data,
    movements: movements.data,
  };
}

/* ------------------------------------------------------------------ */
/* Customer purchase requests (admin review pipeline)                  */
/* ------------------------------------------------------------------ */
export async function loadPurchaseRequests() {
  if (!(await supportsCatalog())) return [...demoPurchaseRequests];

  const { data, error } = await supabase
    .from('purchase_requests')
    .select('*, products(name, sku), variants(label, sku, colour, size)')
    .order('created_at', { ascending: false });

  if (isMissingSupabaseSchema(error)) return [...demoPurchaseRequests];
  if (error) throw error;
  return data;
}

export async function submitPurchaseRequest(payload) {
  if (!(await supportsCatalog())) {
    const product = demoProducts.find((p) => p.id === payload.product_id);
    const variant = product?.variants?.find((v) => v.id === payload.variant_id);
    const id = `req-${Date.now()}`;
    const request = {
      id,
      ...payload,
      status: 'pending',
      admin_note: null,
      status_history: [{ status: 'pending', at: new Date().toISOString() }],
      created_at: new Date().toISOString(),
      products: product ? { name: product.name, sku: product.sku } : null,
      variants: variant ? { label: variant.label, sku: variant.sku } : null,
    };
    demoPurchaseRequests.unshift(request);
    return request;
  }

  const { data, error } = await supabase
    .from('purchase_requests')
    .insert({
      product_id: payload.product_id,
      variant_id: payload.variant_id ?? null,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email ?? null,
      customer_phone: payload.customer_phone ?? null,
      delivery_address: payload.delivery_address,
      city: payload.city ?? null,
      pincode: payload.pincode ?? null,
      notes: payload.notes ?? null,
    })
    .select('id, status, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function updatePurchaseRequestStatus(id, newStatus, note) {
  if (!(await supportsCatalog())) {
    const request = demoPurchaseRequests.find((req) => req.id === id);
    if (!request) throw new Error('Request not found.');
    request.status = newStatus;
    if (note !== undefined && note !== null) request.admin_note = note;
    request.status_history = Array.isArray(request.status_history)
      ? [...request.status_history, { status: newStatus, note: note ?? null, at: new Date().toISOString() }]
      : [{ status: newStatus, note: note ?? null, at: new Date().toISOString() }];
    return request;
  }

  const { data, error } = await supabase.rpc('update_purchase_request_status', {
    request_id: id,
    new_status: newStatus,
    admin_note_value: note ?? null,
  });
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/* Price analysis and similar products                                 */
/* ------------------------------------------------------------------ */
export function computePriceAnalysis(product, allProducts = []) {
  const current = Number(product.selling_price ?? product.unit_price ?? 0);
  const history = Array.isArray(product.price_history) ? product.price_history : [];
  const previousRow =
    history.find((h) => h.price_type === 'selling' && Number(h.price) !== current) ??
    history.find((h) => h.price_type === 'selling');
  const previous = previousRow ? Number(previousRow.price) : null;

  const sameCategory = allProducts.filter(
    (p) => p.category_id === product.category_id && p.id !== product.id,
  );
  const prices = sameCategory
    .map((p) => Number(p.selling_price ?? p.unit_price ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);

  const similarRange =
    prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : null;

  return { current, previous, similarRange, similarCount: prices.length };
}

export function getSimilarProducts(product, allProducts = [], limit = 4) {
  const similar = allProducts
    .filter((p) => p.category_id === product.category_id && p.id !== product.id && p.is_active !== false)
    .slice(0, limit);
  return similar;
}

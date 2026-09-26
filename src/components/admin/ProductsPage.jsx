import React, { useEffect, useMemo, useState } from 'react';
import { PackagePlus, Search, Truck } from 'lucide-react';
import { loadProducts } from '../../services/catalogService';
import { formatCurrency } from '../common/SpecValue';

export default function ProductsPage({ onNewProduct }) {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchProducts() {
      setStatus('loading');
      setError('');
      try {
        const rows = await loadProducts();
        if (!cancelled) setProducts(rows);
        if (!cancelled) setStatus('ready');
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          setStatus('error');
        }
      }
    }
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.sku, p.categories?.name, p.brand, p.model, p.barcode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [products, query]);

  const delivery = useMemo(() => {
    const large = products.filter((p) => p.delivery_category === 'LARGE' || p.delivery_category === 'HEAVY');
    const totalKg = products.reduce(
      (sum, p) => sum + (Number(p.package_weight_kg) || Number(p.net_weight_kg) || 0),
      0,
    );
    return { large: large.length, totalKg };
  }, [products]);

  return (
    <>
      <section className="delivery-summary">
        <Truck size={20} aria-hidden="true" />
        <div>
          <strong>Delivery Planning</strong>
          <p>
            {delivery.large} large/heavy items · Est. combined package weight{' '}
            {Math.round(delivery.totalKg)} kg. Weight, dimensions and delivery
            category are reviewed during fulfilment.
          </p>
        </div>
      </section>

      <section className="toolbar">
        <div>
          <h2>Products</h2>
          <p>{products.length} products in the catalog.</p>
        </div>
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product, SKU, brand, barcode…"
          />
        </label>
        <button className="secondary-button" onClick={onNewProduct}>
          <PackagePlus size={18} aria-hidden="true" />
          New Product
        </button>
      </section>

      {status === 'loading' ? <p className="state-text">Loading products…</p> : null}
      {status === 'error' ? <p className="state-text error">{error}</p> : null}

      {status === 'ready' ? (
        <section className="table-wrap" aria-label="Products table">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Selling Price</th>
                <th>Weight</th>
                <th>Delivery</th>
                <th>Quality</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                    {product.brand ? <p className="cell-sub">{product.brand} · {product.model ?? ''}</p> : null}
                  </td>
                  <td>{product.sku}</td>
                  <td>{product.categories?.name}</td>
                  <td>{product.stock_quantity}</td>
                  <td>{formatCurrency(product.selling_price ?? product.unit_price)}</td>
                  <td>
                    {product.net_weight_kg && Number(product.net_weight_kg) > 0
                      ? `${product.net_weight_kg} kg`
                      : '—'}
                  </td>
                  <td>
                    <span className={`delivery-chip ${String(product.delivery_category ?? '').toLowerCase()}`}>
                      {product.delivery_category ?? '—'}
                    </span>
                    {product.estimated_delivery ? (
                      <p className="cell-sub">{product.estimated_delivery}</p>
                    ) : null}
                  </td>
                  <td>{product.quality_grade ?? '—'}</td>
                  <td>
                    <a className="table-link" href={`#/admin/products/${encodeURIComponent(product.id)}`}>
                      Edit
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}
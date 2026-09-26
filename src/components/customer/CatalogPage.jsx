import React, { useEffect, useMemo, useState } from 'react';
import { Search, ScanLine } from 'lucide-react';
import { loadProducts } from '../../services/catalogService';
import ProductCard from './ProductCard';

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [scanQuery, setScanQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [scanError, setScanError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchProducts() {
      setStatus('loading');
      setError('');
      try {
        const rows = await loadProducts({ activeOnly: true });
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

  const categories = useMemo(() => {
    const names = new Map();
    products.forEach((p) => {
      if (p.categories?.name) names.set(p.category_id, p.categories.name);
    });
    return [...names.entries()];
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== 'all' && p.category_id !== category) return false;
      if (!q) return true;
      return [p.name, p.sku, p.categories?.name, p.brand, p.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [products, query, category]);

  function handleScan(event) {
    event.preventDefault();
    const sku = scanQuery.trim();
    if (!sku) return;
    const match = products.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
    if (match) {
      window.location.hash = `#/product/${encodeURIComponent(match.id)}`;
    } else {
      setScanError(`No product found for "${sku}".`);
    }
  }

  return (
    <main className="customer-page">
      <header className="customer-hero">
        <div className="customer-hero-inner">
          <p className="eyebrow">StockSense Catalog</p>
          <h1>Find the details behind every product</h1>
          <p>
            Scan a barcode or search by product name, SKU or category to view
            the full product description, materials, quality and delivery
            information before you request a purchase.
          </p>
          <form className="scan-box" onSubmit={handleScan}>
            <ScanLine size={18} aria-hidden="true" />
            <input
              type="text"
              value={scanQuery}
              onChange={(event) => {
                setScanQuery(event.target.value);
                setScanError('');
              }}
              placeholder="Scan barcode or type SKU… e.g. FRN-TABLE-006"
              aria-label="Scan barcode or type SKU"
            />
            <button type="submit" className="primary-button">
              Identify Product
            </button>
          </form>
          {scanError ? <p className="form-error">{scanError}</p> : null}
        </div>
      </header>

      <section className="catalog-toolbar">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product, SKU, category…"
          />
        </label>
        <div className="chip-row">
          <button
            type="button"
            className={`filter-chip ${category === 'all' ? 'active' : ''}`}
            onClick={() => setCategory('all')}
          >
            All
          </button>
          {categories.map(([id, name]) => (
            <button
              type="button"
              key={id}
              className={`filter-chip ${category === id ? 'active' : ''}`}
              onClick={() => setCategory(id)}
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      {status === 'loading' ? <p className="state-text">Loading catalog…</p> : null}
      {status === 'error' ? <p className="state-text error">{error}</p> : null}

      {status === 'ready' ? (
        filtered.length > 0 ? (
          <section className="catalog-grid">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </section>
        ) : (
          <p className="state-text">No products match your search.</p>
        )
      ) : null}
    </main>
  );
}
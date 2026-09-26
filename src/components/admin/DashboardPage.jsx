import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  PackagePlus,
  Search,
  Truck,
} from 'lucide-react';
import { formatCurrency } from '../common/SpecValue';

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <article className={`stat-card ${tone}`}>
      <Icon size={22} aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

export default function DashboardPage({ data, query, onQueryChange, onNewProduct }) {
  const metrics = useMemo(() => {
    const products = data?.products ?? [];
    const totalValue = products.reduce(
      (sum, product) => sum + product.stock_quantity * product.unit_price,
      0,
    );
    const lowStock = products.filter(
      (product) => product.stock_quantity <= product.reorder_level,
    );
    return {
      products: products.length,
      suppliers: data?.suppliers?.length ?? 0,
      lowStock: lowStock.length,
      totalValue,
    };
  }, [data]);

  const filteredProducts = useMemo(() => {
    const products = data?.products ?? [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return products;
    return products.filter((product) =>
      [product.name, product.sku, product.categories?.name, product.suppliers?.name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [data, query]);

  return (
    <>
      <section className="stats-grid" aria-label="Inventory summary">
        <StatCard icon={Boxes} label="Products" value={metrics.products} tone="teal" />
        <StatCard icon={Truck} label="Suppliers" value={metrics.suppliers} tone="blue" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={metrics.lowStock} tone="amber" />
        <StatCard icon={CheckCircle2} label="Stock Value" value={formatCurrency(metrics.totalValue)} tone="green" />
      </section>

      <section className="toolbar">
        <div>
          <h2>Product Inventory</h2>
          <p>Review stock levels and delivery categories for fulfilment planning.</p>
        </div>
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search product, SKU, category..."
          />
        </label>
        <button className="secondary-button" onClick={onNewProduct}>
          <PackagePlus size={18} aria-hidden="true" />
          New Stock
        </button>
      </section>

      <section className="table-wrap" aria-label="Product inventory table">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Selling</th>
              <th>Delivery</th>
              <th>Quality</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const isLow = product.stock_quantity <= product.reorder_level;
              return (
                <tr key={product.id}>
                  <td>{product.sku}</td>
                  <td>
                    <strong>{product.name}</strong>
                    {product.brand ? <p className="cell-sub">{product.brand}</p> : null}
                  </td>
                  <td>{product.categories?.name}</td>
                  <td>{product.stock_quantity}</td>
                  <td>{formatCurrency(product.selling_price ?? product.unit_price)}</td>
                  <td>
                    <span className={`delivery-chip ${String(product.delivery_category ?? '').toLowerCase()}`}>
                      {product.delivery_category ?? '—'}
                    </span>
                  </td>
                  <td>{product.quality_grade ?? '—'}</td>
                  <td>
                    <span className={`status-pill ${isLow ? 'low' : 'ok'}`}>
                      {isLow ? 'Reorder' : 'Healthy'}
                    </span>
                  </td>
                  <td>
                    <a className="table-link" href={`#/admin/products/${encodeURIComponent(product.id)}`}>
                      Edit
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="activity-grid">
        <div className="activity-panel">
          <h2>Recent Stock Movement</h2>
          <div className="movement-list">
            {(data?.movements ?? []).map((movement) => (
              <article key={movement.id} className="movement-item">
                <span className={`movement-type ${movement.movement_type}`}>
                  {movement.movement_type}
                </span>
                <div>
                  <strong>{movement.products?.name}</strong>
                  <p>
                    {movement.quantity} units · {movement.note}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="activity-panel" id="suppliers">
          <h2>Supplier Directory</h2>
          <div className="supplier-list">
            {(data?.suppliers ?? []).map((supplier) => (
              <article key={supplier.id} className="supplier-item">
                <strong>{supplier.name}</strong>
                <span>{supplier.contact_name}</span>
                <span>{supplier.email}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
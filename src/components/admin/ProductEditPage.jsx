import React, { useEffect, useState } from 'react';
import { Truck } from 'lucide-react';
import { loadProduct } from '../../services/catalogService';
import { formatCurrency, hasValue } from '../common/SpecValue';
import ProductFormWizard from './ProductFormWizard';

export default function ProductEditPage({ productId, onSaved, onCancel }) {
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    async function fetchProduct() {
      setStatus('loading');
      try {
        const item = await loadProduct(productId);
        if (!cancelled) setProduct(item);
        if (!cancelled) setStatus(item ? 'ready' : 'notfound');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    fetchProduct();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const dimensions = hasValue(product?.length_cm)
    ? `${product.length_cm} × ${product.width_cm} × ${product.height_cm} cm`
    : null;
  const packageDimensions = hasValue(product?.package_length_cm)
    ? `${product.package_length_cm} × ${product.package_width_cm} × ${product.package_height_cm} cm`
    : null;

  return (
    <>
      {status === 'ready' && product ? (
        <section className="delivery-review-grid">
          <div className="activity-panel">
            <h2><Truck size={16} aria-hidden="true" /> Delivery Review</h2>
            <div className="spec-grid">
              <SpecRow label="Product" value={product.name} />
              <SpecRow label="Net Weight" value={product.net_weight_kg ? `${product.net_weight_kg} kg` : null} />
              <SpecRow label="Package Weight" value={product.package_weight_kg ? `${product.package_weight_kg} kg` : null} />
              <SpecRow label="Product Dimensions" value={dimensions} />
              <SpecRow label="Package Dimensions" value={packageDimensions} />
              <SpecRow label="Delivery Category" value={product.delivery_category} />
              <SpecRow label="Estimated Delivery" value={product.estimated_delivery} />
            </div>
          </div>
          <div className="activity-panel">
            <h2>Price History</h2>
            {(product.price_history ?? []).length > 0 ? (
              <ul className="price-history-list">
                {(product.price_history ?? [])
                  .slice()
                  .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
                  .map((entry) => (
                    <li key={entry.id}>
                      <strong>{formatCurrency(entry.price)}</strong>
                      <span>{entry.price_type}</span>
                      <span>{entry.note}</span>
                      <small>{new Date(entry.recorded_at).toLocaleDateString()}</small>
                    </li>
                  ))}
              </ul>
            ) : (
              <p>No price history recorded.</p>
            )}
          </div>
        </section>
      ) : null}

      <ProductFormWizard productId={productId} onSaved={onSaved} onCancel={onCancel} />
    </>
  );
}

function SpecRow({ label, value }) {
  return (
    <div className="spec-row">
      <span className="spec-label">{label}</span>
      <span className={`spec-value ${hasValue(value) ? '' : 'spec-muted'}`}>
        {hasValue(value) ? value : 'Information not provided'}
      </span>
    </div>
  );
}
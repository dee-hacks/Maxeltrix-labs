import React from 'react';
import { formatCurrency } from '../common/SpecValue';

export default function ProductCard({ product }) {
  const price = Number(product.selling_price ?? product.unit_price ?? 0);
  const mrp = product.mrp ? Number(product.mrp) : null;
  const available = Number(product.stock_quantity ?? 0) > 0;
  const image = product.images?.[0]?.url ?? product.image_url ?? null;

  return (
    <article className="product-card">
      <a href={`#/product/${encodeURIComponent(product.id)}`} className="product-card-link">
        <div className="product-card-image">
          {image ? (
            <img src={image} alt={product.name} loading="lazy" />
          ) : (
            <span className="product-card-placeholder">No image</span>
          )}
          {product.quality_grade ? (
            <span className="product-card-badge">{product.quality_grade}</span>
          ) : null}
        </div>
        <div className="product-card-body">
          <p className="product-card-category">{product.categories?.name ?? 'Product'}</p>
          <h3>{product.name}</h3>
          <p className="product-card-price">
            {formatCurrency(price)}
            {mrp && mrp > price ? (
              <span className="product-card-mrp">{formatCurrency(mrp)}</span>
            ) : null}
          </p>
          <p className={`product-card-status ${available ? 'ok' : 'out'}`}>
            {available ? 'In Stock' : 'Out of Stock'}
          </p>
        </div>
      </a>
    </article>
  );
}
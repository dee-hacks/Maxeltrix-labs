import React, { useEffect, useMemo, useState } from 'react';
import { Heart, Mail, Scale, Share2, ShoppingBag, Truck } from 'lucide-react';
import { loadProduct, loadProducts } from '../../services/catalogService';
import { computePriceAnalysis, getSimilarProducts } from '../../services/inventoryService';
import SpecValue, {
  CheckList,
  formatCurrency,
  groupAttributes,
  hasValue,
} from '../common/SpecValue';
import ProductCard from './ProductCard';
import RequestPurchaseModal from './RequestPurchaseModal';

const GROUP_ORDER = [
  'material', 'wood', 'fabric', 'leather', 'metal', 'plastic',
  'electronic', 'capacity', 'durability', 'finish', 'colour',
];

function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem('stocksense_wishlist') ?? '[]');
  } catch {
    return [];
  }
}

function setWishlist(items) {
  localStorage.setItem('stocksense_wishlist', JSON.stringify(items));
}

export default function ProductPage({ productId }) {
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setStatus('loading');
      setError('');
      try {
        const [item, rows] = await Promise.all([
          loadProduct(productId),
          loadProducts({ activeOnly: true }),
        ]);
        if (cancelled) return;
        if (!item) {
          setStatus('error');
          setError('Product not found.');
          return;
        }
        setProduct(item);
        setAllProducts(rows);
        setSelectedVariantId(null);
        setActiveImage(0);
        setStatus('ready');
        setWishlisted(getWishlist().includes(item.id));
        setShared(false);
      } catch (loadError) {
        if (!cancelled) {
          setStatus('error');
          setError(loadError.message);
        }
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (status === 'loading') {
    return <main className="customer-page"><p className="state-text">Loading product…</p></main>;
  }
  if (status === 'error') {
    return <main className="customer-page"><p className="state-text error">{error}</p></main>;
  }
  if (!product) return null;

  return (
    <ProductPageContent
      product={product}
      allProducts={allProducts}
      selectedVariantId={selectedVariantId}
      setSelectedVariantId={setSelectedVariantId}
      activeImage={activeImage}
      setActiveImage={setActiveImage}
      showRequest={showRequest}
      setShowRequest={setShowRequest}
      wishlisted={wishlisted}
      setWishlisted={setWishlisted}
      shared={shared}
      setShared={setShared}
    />
  );
}
function ProductPageContent({
  product,
  allProducts,
  selectedVariantId,
  setSelectedVariantId,
  activeImage,
  setActiveImage,
  showRequest,
  setShowRequest,
  wishlisted,
  setWishlisted,
  shared,
  setShared,
}) {
  const variants = product.variants ?? [];
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;

  const sku = selectedVariant?.sku ?? product.sku;
  const sellingPrice = Number(selectedVariant?.selling_price ?? product.selling_price ?? product.unit_price ?? 0);
  const mrp = Number(selectedVariant?.mrp ?? product.mrp ?? 0);
  const discount = mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
  const stock = Number(selectedVariant?.stock_quantity ?? product.stock_quantity ?? 0);
  const available = stock > 0;

  const grouped = useMemo(() => {
    return groupAttributes(product.attributes ?? []).slice().sort((a, b) => {
      const ia = GROUP_ORDER.indexOf(a.group_key);
      const ib = GROUP_ORDER.indexOf(b.group_key);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [product]);

  const images = useMemo(() => {
    const rows = product.images ?? [];
    if (!selectedVariant) return rows;
    const variantRows = rows.filter((img) => img.variant_id === selectedVariant.id);
    const neutral = rows.filter((img) => !img.variant_id);
    return variantRows.length > 0 ? [...variantRows, ...neutral] : rows;
  }, [product, selectedVariant]);

  const activeSrc = images[activeImage]?.url ?? product.image_url ?? null;

  const analysis = useMemo(() => computePriceAnalysis(product, allProducts), [product, allProducts]);
  const similar = useMemo(() => getSimilarProducts(product, allProducts), [product, allProducts]);
function toggleWishlist() {
    const current = getWishlist();
    const next = current.includes(product.id)
      ? current.filter((id) => id !== product.id)
      : [...current, product.id];
    setWishlist(next);
    setWishlisted(next.includes(product.id));
  }

  function handleShare() {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      });
    } else {
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  const attrsById = new Map((product.attributes ?? []).map((a) => [a.field_key, a]));
  const attrValue = (fieldKey) => attrsById.get(fieldKey)?.value;
  const primaryColour = attrValue('primary_colour');

  return (
    <main className="customer-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <a href="#/catalog">Catalog</a>
        <span>/</span>
        <span>{product.categories?.name ?? 'Product'}</span>
      </nav>

      <section className="product-hero">
        <div className="product-gallery">
          {activeSrc ? <img className="product-main-image" src={activeSrc} alt={product.name} /> : null}
          {images.length > 1 ? (
            <div className="product-thumbs">
              {images.map((img, index) => (
                <button
                  type="button"
                  key={img.id ?? index}
                  className={`thumb ${activeImage === index ? 'active' : ''}`}
                  onClick={() => setActiveImage(index)}
                  aria-label={img.alt_text ?? `Image ${index + 1}`}
                >
                  <img src={img.url} alt={img.alt_text ?? ''} />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="product-summary">
          <div className="product-title-row">
            <p className="eyebrow">{product.categories?.name ?? 'Product'} · {product.brand ?? 'No brand'}</p>
            <h1>{product.name}</h1>
            <p className="product-sku">
              SKU: {sku}
              {product.model ? <span> · Model {product.model}</span> : null}
            </p>
          </div>

          <div className="product-quality-row">
            {product.quality_grade ? (
              <span className={`quality-chip grade-${String(product.quality_grade).toLowerCase()}`}>{product.quality_grade}</span>
            ) : null}
            {product.condition ? <span className="quality-chip">{product.condition}</span> : null}
            {primaryColour ? <span className="quality-chip">{primaryColour}</span> : null}
          </div>

          <div className="product-price-block">
            <p className="product-price">
              {formatCurrency(sellingPrice)}
              {mrp > sellingPrice ? <s className="product-mrp">{formatCurrency(mrp)}</s> : null}
              {discount > 0 ? <span className="discount-chip">Save {discount}%</span> : null}
            </p>
            <p className="availability-line">
              <span className={`status-pill ${available ? 'ok' : 'low'}`}>
                {available ? 'In Stock' : 'Out of Stock'}
              </span>
              {available ? <span> ({stock} available)</span> : null}
            </p>
          </div>

          {product.short_description ? <p className="product-short-desc">{product.short_description}</p> : null}

          {Array.isArray(product.key_features) && product.key_features.length > 0 ? (
            <section className="key-features">
              <h2>Key Features</h2>
              <CheckList items={product.key_features} />
            </section>
          ) : null}

          {variants.length > 0 ? (
            <section className="variant-picker">
              <h2>Select Variant</h2>
              <div className="variant-chips">
                <button
                  type="button"
                  className={`filter-chip ${!selectedVariant ? 'active' : ''}`}
                  onClick={() => setSelectedVariantId(null)}
                >
                  Default
                </button>
                {variants.map((variant) => (
                  <button
                    type="button"
                    key={variant.id}
                    className={`filter-chip ${selectedVariant?.id === variant.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedVariantId(variant.id);
                      setActiveImage(0);
                    }}
                  >
                    {variant.label}
                    {variant.size ? ` · ${variant.size}` : ''}
                  </button>
                ))}
              </div>
              {selectedVariant ? (
                <p className="variant-info">
                  Variant SKU: {selectedVariant.sku} · Price{' '}
                  {formatCurrency(selectedVariant.selling_price)} · {selectedVariant.stock_quantity} in stock
                </p>
              ) : null}
            </section>
          ) : null}
<div className="product-actions">
            <button className="primary-button buy-button" onClick={() => setShowRequest(true)}>
              <ShoppingBag size={18} aria-hidden="true" /> Buy / Request Purchase
            </button>
            <a
              className="secondary-button"
              href={`mailto:store@stocksense.example?subject=Enquiry: ${encodeURIComponent(product.name)} (${sku})`}
            >
              <Mail size={18} aria-hidden="true" /> Enquire
            </a>
            <a className="secondary-button" href="#/catalog">
              <Scale size={18} aria-hidden="true" /> Compare
            </a>
            <button
              type="button"
              className={`icon-button action-round ${wishlisted ? 'wish-active' : ''}`}
              onClick={toggleWishlist}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart size={18} />
            </button>
            <button type="button" className="icon-button action-round" onClick={handleShare} aria-label="Share product">
              <Share2 size={18} />
            </button>
          </div>
          {shared ? <p className="share-note">Link copied to clipboard.</p> : null}
        </div>
      </section>

      <SpecSections product={product} grouped={grouped} analysis={analysis} />

      <section className="similar-section">
        <h2>Similar Products</h2>
        {similar.length > 0 ? (
          <div className="catalog-grid">
            {similar.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        ) : (
          <p className="state-text">No similar products in this category.</p>
        )}
      </section>

      <section className="delivery-section spec-card">
        <h2><Truck size={18} /> Delivery Information</h2>
        <div className="spec-grid">
          <SpecValue label="Product Category" value={product.delivery_category} />
          <SpecValue label="Estimated Delivery" value={product.estimated_delivery} />
          <SpecValue label="Net Weight" value={product.net_weight_kg} unit="kg" />
          <SpecValue label="Package Weight" value={product.package_weight_kg} unit="kg" />
          <SpecValue
            label="Package Dimensions"
            value={
              product.package_length_cm
                ? `${product.package_length_cm} × ${product.package_width_cm} × ${product.package_height_cm} cm`
                : null
            }
          />
        </div>
      </section>

      <div className="sticky-buy-bar">
        <div>
          <p className="product-sku">SKU: {sku}</p>
          <p className="sticky-price">
            {formatCurrency(sellingPrice)}
            {mrp > sellingPrice ? <s>{formatCurrency(mrp)}</s> : null}
          </p>
        </div>
        <button className="primary-button" onClick={() => setShowRequest(true)}>
          <ShoppingBag size={18} aria-hidden="true" /> Request Purchase
        </button>
      </div>

      {showRequest ? (
        <RequestPurchaseModal
          product={product}
          variant={selectedVariant}
          onClose={() => setShowRequest(false)}
        />
      ) : null}
    </main>
  );
}
function SpecSections({ product, grouped, analysis }) {
  const dims = [product.length_cm, product.width_cm, product.height_cm, product.depth_cm];
  const hasDims = dims.some(hasValue);
  const hasPackageDims = [product.package_length_cm, product.package_width_cm, product.package_height_cm].some(hasValue);
  const hasWeights = hasValue(product.net_weight_kg) || hasValue(product.gross_weight_kg);

  return (
    <>
      {grouped.map((group) => (
        <AttributeGroup key={group.group_key} group={group} />
      ))}

      {(hasDims || hasWeights || hasValue(product.volume_litres) || hasValue(product.load_capacity_kg)) ? (
        <section className="spec-card">
          <h2>Physical Specifications</h2>
          <div className="spec-grid">
            <SpecValue label="Length" value={product.length_cm} unit="cm" />
            <SpecValue label="Width" value={product.width_cm} unit="cm" />
            <SpecValue label="Height" value={product.height_cm} unit="cm" />
            <SpecValue label="Depth" value={product.depth_cm} unit="cm" />
            <SpecValue label="Volume" value={product.volume_litres} unit="L" />
            <SpecValue label="Net Weight" value={product.net_weight_kg} unit="kg" />
            <SpecValue label="Gross Weight" value={product.gross_weight_kg} unit="kg" />
            <SpecValue label={product.load_capacity_label ?? 'Load Capacity'} value={product.load_capacity_kg} unit="kg" />
          </div>
        </section>
      ) : null}

      {(hasDims || hasPackageDims) ? (
        <section className="spec-card">
          <h2>Dimensions</h2>
          <div className="spec-grid two-col">
            <div>
              <h3>Product Dimensions</h3>
              <SpecValue label="Length" value={product.length_cm} unit="cm" />
              <SpecValue label="Width" value={product.width_cm} unit="cm" />
              <SpecValue label="Height" value={product.height_cm} unit="cm" />
            </div>
            <div>
              <h3>Package Dimensions</h3>
              <SpecValue label="Length" value={product.package_length_cm} unit="cm" />
              <SpecValue label="Width" value={product.package_width_cm} unit="cm" />
              <SpecValue label="Height" value={product.package_height_cm} unit="cm" />
            </div>
          </div>
        </section>
      ) : null}

      {hasValue(product.quantity_per_pack) ? (
        <section className="spec-card">
          <h2>Quantity Information</h2>
          <div className="spec-grid">
            <SpecValue label="Quantity" value={product.quantity_per_pack} />
            <SpecValue label="Unit" value={product.quantity_unit} />
          </div>
        </section>
      ) : null}

      {hasValue(product.warranty_period) || hasValue(product.warranty_type) ? (
        <section className="spec-card">
          <h2>Warranty</h2>
          <div className="spec-grid">
            <SpecValue label="Warranty Period" value={product.warranty_period} />
            <SpecValue label="Warranty Type" value={product.warranty_type} />
            <SpecValue label="Warranty Provider" value={product.warranty_provider} />
            <SpecValue label="Coverage" value={product.warranty_coverage} />
            <SpecValue label="Exclusions" value={product.warranty_exclusions} />
          </div>
        </section>
      ) : null}

      {Array.isArray(product.package_contents) && product.package_contents.length > 0 ? (
        <section className="spec-card">
          <h2>What&apos;s Included</h2>
          <CheckList items={product.package_contents} />
        </section>
      ) : null}

      {Array.isArray(product.care_instructions) && product.care_instructions.length > 0 ? (
        <section className="spec-card">
          <h2>Care Instructions</h2>
          <CheckList items={product.care_instructions} />
        </section>
      ) : null}

      {Array.isArray(product.safety_instructions) && product.safety_instructions.length > 0 ? (
        <section className="spec-card">
          <h2>Safety</h2>
          <CheckList items={product.safety_instructions} />
        </section>
      ) : null}
{hasValue(product.assembly_required) || hasValue(product.assembly_time) ? (
        <section className="spec-card">
          <h2>Assembly</h2>
          <div className="spec-grid">
            <SpecValue label="Assembly Required" value={product.assembly_required ? 'Yes' : 'No'} />
            <SpecValue label="Estimated Assembly Time" value={product.assembly_time} />
            <SpecValue label="Tools Required" value={product.tools_required} />
            <SpecValue label="Assembly Service" value={product.assembly_service} />
          </div>
        </section>
      ) : null}

      {(hasValue(product.brand) && product.brand !== 'No brand') || hasValue(product.country_of_origin) ? (
        <section className="spec-card">
          <h2>Product Origin</h2>
          <div className="spec-grid">
            <SpecValue label="Brand" value={product.brand} />
            <SpecValue label="Model" value={product.model} />
            <SpecValue label="Country of Origin" value={product.country_of_origin} />
          </div>
        </section>
      ) : null}

      {[
        product.material_sustainability,
        product.recycled_content,
        product.recyclable_packaging,
        product.wood_certification,
      ].some(hasValue) || product.eco_friendly_packaging ? (
        <section className="spec-card">
          <h2>Environmental Information</h2>
          <div className="spec-grid">
            <SpecValue label="Material Sustainability" value={product.material_sustainability} />
            <SpecValue label="Recycled Content" value={product.recycled_content} />
            <SpecValue label="Recyclable Packaging" value={product.recyclable_packaging} />
            <SpecValue label="Wood Certification" value={product.wood_certification} />
            <SpecValue label="Eco-friendly Packaging" value={product.eco_friendly_packaging ? 'Yes' : 'No'} />
          </div>
        </section>
      ) : null}

      {analysis.previous !== null || analysis.similarRange !== null ? (
        <section className="spec-card price-analysis">
          <h2>Price Analysis</h2>
          <div className="spec-grid">
            <SpecValue label="Current Price" value={analysis.current ? formatCurrency(analysis.current) : null} />
            <SpecValue label="Previous Price" value={analysis.previous ? formatCurrency(analysis.previous) : null} />
            <SpecValue
              label="Similar Product Range"
              value={
                analysis.similarRange
                  ? `${formatCurrency(analysis.similarRange.min)} – ${formatCurrency(analysis.similarRange.max)}`
                  : null
              }
            />
          </div>
        </section>
      ) : null}
    </>
  );
}
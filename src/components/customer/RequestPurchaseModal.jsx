import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { submitPurchaseRequest } from '../../services/inventoryService';
import { formatCurrency } from '../common/SpecValue';

export default function RequestPurchaseModal({ product, variant, onClose }) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    delivery_address: '',
    city: '',
    pincode: '',
    notes: '',
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('saving');
    setError('');
    try {
      const created = await submitPurchaseRequest({
        product_id: product.id,
        variant_id: variant?.id ?? null,
        ...form,
      });
      setResult(created);
      setStatus('done');
    } catch (submitError) {
      setError(submitError.message);
      setStatus('idle');
    }
  }

  const price = Number(variant?.selling_price ?? product.selling_price ?? product.unit_price ?? 0);

  if (status === 'done') {
    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <section className="modal-panel modal-success">
          <CheckCircle2 size={44} className="success-icon" aria-hidden="true" />
          <h2>Purchase request received</h2>
          <p>
            Your request for <strong>{product.name}</strong> has been submitted
            and is now under <strong>Admin Review</strong>.
          </p>
          <p className="request-ref">
            Request ID: <strong>{result?.id ?? '—'}</strong>
          </p>
          <p>
            Status: <span className="status-pill low">Pending</span>
          </p>
          <p className="request-next">
            An administrator will review the request. If more information is
            needed, we will contact you before confirming delivery.
          </p>
          <button className="primary-button" onClick={onClose}>
            Back to product
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <section className="modal-panel">
        <header className="modal-header">
          <div>
            <p className="eyebrow">Request Purchase</p>
            <h2>{product.name}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <p className="request-price">
          {formatCurrency(price)}
          {variant ? ` · ${variant.label}` : ''}
          {variant ? ` · SKU ${variant.sku}` : ` · SKU ${product.sku}`}
        </p>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              type="text"
              required
              value={form.customer_name}
              onChange={(event) => update('customer_name', event.target.value)}
            />
          </label>
          <div className="form-row">
            <label>
              Email
              <input
                type="email"
                value={form.customer_email}
                onChange={(event) => update('customer_email', event.target.value)}
              />
            </label>
            <label>
              Phone
              <input
                type="tel"
                required
                value={form.customer_phone}
                onChange={(event) => update('customer_phone', event.target.value)}
              />
            </label>
          </div>
          <label>
            Delivery address
            <textarea
              required
              rows="2"
              value={form.delivery_address}
              onChange={(event) => update('delivery_address', event.target.value)}
            />
          </label>
          <div className="form-row">
            <label>
              City
              <input
                type="text"
                value={form.city}
                onChange={(event) => update('city', event.target.value)}
              />
            </label>
            <label>
              Pincode
              <input
                type="text"
                value={form.pincode}
                onChange={(event) => update('pincode', event.target.value)}
              />
            </label>
          </div>
          <label>
            Notes (optional)
            <textarea
              rows="2"
              value={form.notes}
              onChange={(event) => update('notes', event.target.value)}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Submitting…' : 'Request Purchase'}
          </button>
        </form>
      </section>
    </div>
  );
}
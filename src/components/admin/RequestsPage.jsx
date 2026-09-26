import React, { useEffect, useState } from 'react';
import { Inbox } from 'lucide-react';
import { loadPurchaseRequests, updatePurchaseRequestStatus } from '../../services/inventoryService';
import { formatCurrency } from '../common/SpecValue';

const FLOW = ['pending', 'info_required', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

function nextActions(status) {
  switch (status) {
    case 'pending':
      return [
        { to: 'info_required', label: 'Mark Info Required' },
        { to: 'confirmed', label: 'Confirm' },
        { to: 'cancelled', label: 'Cancel', danger: true },
      ];
    case 'info_required':
      return [
        { to: 'confirmed', label: 'Info Received · Confirm' },
        { to: 'cancelled', label: 'Cancel', danger: true },
      ];
    case 'confirmed':
      return [{ to: 'preparing', label: 'Start Preparing' }];
    case 'preparing':
      return [{ to: 'out_for_delivery', label: 'Out for Delivery' }];
    case 'out_for_delivery':
      return [{ to: 'delivered', label: 'Mark Delivered' }];
    default:
      return [];
  }
}

function statusLabel(status) {
  return String(status ?? '').replace(/_/g, ' ');
}

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [notes, setNotes] = useState({});
  const [updatingId, setUpdatingId] = useState(null);

  async function fetchRequests() {
    setStatus('loading');
    setError('');
    try {
      const rows = await loadPurchaseRequests();
      setRequests(rows);
      setStatus('ready');
    } catch (loadError) {
      setError(loadError.message);
      setStatus('error');
    }
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  async function handleUpdate(id, nextStatus) {
    setUpdatingId(id);
    setError('');
    try {
      await updatePurchaseRequestStatus(id, nextStatus, notes[id] ?? null);
      setNotes((prev) => ({ ...prev, [id]: '' }));
      await fetchRequests();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setUpdatingId(null);
    }
  }
return (
    <>
      <section className="toolbar">
        <div>
          <h2>Purchase Requests</h2>
          <p>Customer requests flow through admin review until delivery.</p>
        </div>
        <button className="secondary-button" onClick={fetchRequests}>
          <Inbox size={18} aria-hidden="true" /> Refresh
        </button>
      </section>

      {error ? <p className="form-error">{error}</p> : null}
      {status === 'loading' ? <p className="state-text">Loading requests…</p> : null}
      {status === 'error' ? <p className="state-text error">{error}</p> : null}

      {status === 'ready' ? (
        requests.length > 0 ? (
          <div className="request-list">
            {requests.map((request) => {
              const actions = nextActions(request.status);
              return (
                <article className="request-card" key={request.id}>
                  <div className="request-card-header">
                    <div>
                      <strong>{request.products?.name ?? 'Product'}</strong>
                      {request.variants ? (
                        <p className="cell-sub">
                          Variant: {request.variants.label ?? request.variants.sku}
                        </p>
                      ) : null}
                    </div>
                    <span className={`status-pill ${request.status === 'delivered' ? 'ok' : request.status === 'cancelled' ? 'reject' : 'low'}`}>
                      {statusLabel(request.status)}
                    </span>
                  </div>

                  <div className="request-card-body">
                    <div>
                      <p className="cell-sub">Customer</p>
                      <strong>{request.customer_name}</strong>
                      <p className="cell-sub">{request.customer_email}</p>
                      <p className="cell-sub">{request.customer_phone}</p>
                    </div>
                    <div>
                      <p className="cell-sub">Delivery Address</p>
                      <p>{request.delivery_address}</p>
                      <p className="cell-sub">
                        {request.city ?? ''}{request.pincode ? ` · ${request.pincode}` : ''}
                      </p>
                      {request.notes ? <p className="cell-sub">Note: {request.notes}</p> : null}
                    </div>
                    <div>
                      <p className="cell-sub">Requested</p>
                      <p>{new Date(request.created_at).toLocaleString()}</p>
                      {request.products?.selling_price ? (
                        <>
                          <p className="cell-sub">Reference Price</p>
                          <p>{formatCurrency(request.products.selling_price)}</p>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {request.admin_note ? (
                    <p className="admin-note">Admin note: {request.admin_note}</p>
                  ) : null}

                  <div className="request-card-footer">
                    <input
                      className="note-input"
                      type="text"
                      placeholder="Add a note for this request…"
                      value={notes[request.id] ?? ''}
                      onChange={(event) =>
                        setNotes((prev) => ({ ...prev, [request.id]: event.target.value }))
                      }
                    />
                    <div className="request-actions">
                      {actions.map((action) => (
                        <button
                          key={action.to}
                          className={action.danger ? 'secondary-button danger-button' : 'secondary-button'}
                          disabled={updatingId === request.id}
                          onClick={() => handleUpdate(request.id, action.to)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="state-text">No purchase requests yet.</p>
        )
      ) : null}
    </>
  );
}
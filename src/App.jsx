import { useEffect, useState } from 'react';
import { Boxes, ShieldCheck } from 'lucide-react';
import { demoCredentials } from './data/demoData';
import { hasSupabaseConfig } from './lib/supabase';
import { loadDashboardData, signInAdmin } from './services/inventoryService';

import AdminShell from './components/admin/AdminShell';
import DashboardPage from './components/admin/DashboardPage';
import ProductsPage from './components/admin/ProductsPage';
import ProductEditPage from './components/admin/ProductEditPage';
import ProductFormWizard from './components/admin/ProductFormWizard';
import RequestsPage from './components/admin/RequestsPage';
import AttributeManagerPage from './components/admin/AttributeManagerPage';
import CatalogPage from './components/customer/CatalogPage';
import ProductPage from './components/customer/ProductPage';

/* ------------------------------------------------------------------ */
/* Tiny hash router (no external dependency)                          */
/* ------------------------------------------------------------------ */
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || '#/catalog');

  useEffect(() => {
    const onChange = () => {
      const next = window.location.hash || '#/catalog';
      setHash(next);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const clean = hash.replace(/^#/, '');
  const parts = clean.split('/').filter(Boolean);
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState(demoCredentials.email);
  const [password, setPassword] = useState(demoCredentials.password);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const admin = await signInAdmin(email, password);
      onLogin(admin);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-mark">
          <Boxes size={28} aria-hidden="true" />
        </div>
        <p className="eyebrow">Admin Dashboard</p>
        <h1>StockSense</h1>
        <p className="auth-copy">
          Manage product descriptions, materials, quality attributes, pricing,
          delivery details and the customer purchase-review pipeline.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="primary-button" disabled={isLoading}>
            <ShieldCheck size={18} aria-hidden="true" />
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="credential-strip">
          <span>Demo: {demoCredentials.email}</span>
          <span>{demoCredentials.password}</span>
        </div>
        <p className="mode-note">
          {hasSupabaseConfig
            ? 'Connected to Supabase.'
            : 'Running with local demo data until Supabase env keys are added.'}
        </p>
        <a className="customer-link" href="#/catalog">
          View the customer catalog instead
        </a>
      </section>
    </main>
  );
}
  const name = parts[0] || 'catalog';
  const param = parts[1] ? decodeURIComponent(parts[1]) : null;
  const sub = parts[1] ?? null;
  return { name, sub, param, parts };
}
function AdminArea({ admin, onLogout, route }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [dashQuery, setDashQuery] = useState('');

  useEffect(() => {
    if (route.sub) return;
    let cancelled = false;
    async function fetchData() {
      setStatus('loading');
      setError('');
      try {
        const dashboardData = await loadDashboardData();
        if (!cancelled) setData(dashboardData);
        if (!cancelled) setStatus('ready');
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          setStatus('error');
        }
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [route.sub]);

  const title = route.sub === 'products'
    ? (route.param ? 'Edit Product' : 'Products')
    : route.sub === 'requests' ? 'Purchase Requests'
    : route.sub === 'attributes' ? 'Attribute Fields'
    : 'Admin Dashboard';

  const active = route.sub === 'products'
    ? 'products'
    : route.sub === 'requests' ? 'requests'
    : route.sub === 'attributes' ? 'attributes'
    : 'dashboard';

  function goTo(hash) {
    window.location.hash = hash;
  }

  let content = null;
  if (!route.sub) {
    content = status === 'loading'
      ? <p className="state-text">Loading inventory data...</p>
      : status === 'error' ? <p className="state-text error">{error}</p>
      : data ? (
        <DashboardPage
          data={data}
          query={dashQuery}
          onQueryChange={setDashQuery}
          onNewProduct={() => goTo('#/admin/products/new')}
        />
      ) : null;
  } else if (route.sub === 'products' && route.param === 'new') {
    content = (
      <ProductFormWizard
        onSaved={() => goTo('#/admin/products')}
        onCancel={() => goTo('#/admin/products')}
      />
    );
  } else if (route.sub === 'products' && route.param) {
    content = (
      <ProductEditPage
        productId={route.param}
        onSaved={() => goTo('#/admin/products')}
        onCancel={() => goTo('#/admin/products')}
      />
    );
  } else if (route.sub === 'products') {
    content = <ProductsPage onNewProduct={() => goTo('#/admin/products/new')} />;
  } else if (route.sub === 'requests') {
    content = <RequestsPage />;
  } else if (route.sub === 'attributes') {
    content = <AttributeManagerPage />;
  } else {
    content = <p className="state-text">Unknown admin page.</p>;
  }
return (
    <AdminShell admin={admin} onLogout={onLogout} title={title} active={active}>
      {content}
    </AdminShell>
  );
}

export default function App() {
  const [admin, setAdmin] = useState(null);
  const route = useHashRoute();

  if (route.name === 'product' && route.param) {
    return <ProductPage productId={route.param} />;
  }

  if (route.name !== 'admin') {
    return <CatalogPage />;
  }

  if (!admin) {
    return <LoginScreen onLogin={setAdmin} />;
  }

  return <AdminArea admin={admin} onLogout={() => setAdmin(null)} route={route} />;
}
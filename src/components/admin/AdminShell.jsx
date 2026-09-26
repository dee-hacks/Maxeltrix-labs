import React from 'react';
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Inbox,
  LogOut,
  Settings2,
  ShieldCheck,
  Store,
} from 'lucide-react';

export default function AdminShell({ admin, onLogout, title, active, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Boxes size={26} aria-hidden="true" />
          <span>StockSense</span>
        </div>
        <nav aria-label="Admin navigation">
          <a className={active === 'dashboard' ? 'active' : ''} href="#/admin">
            <BarChart3 size={18} aria-hidden="true" /> Dashboard
          </a>
          <a className={active === 'products' ? 'active' : ''} href="#/admin/products">
            <ClipboardList size={18} aria-hidden="true" /> Products
          </a>
          <a className={active === 'requests' ? 'active' : ''} href="#/admin/requests">
            <Inbox size={18} aria-hidden="true" /> Requests
          </a>
          <a className={active === 'attributes' ? 'active' : ''} href="#/admin/attributes">
            <Settings2 size={18} aria-hidden="true" /> Attributes
          </a>
          <a href="#/catalog">
            <Store size={18} aria-hidden="true" /> Customer Catalog
          </a>
        </nav>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h1>{title}</h1>
          </div>
          <div className="admin-chip">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>{admin.full_name ?? admin.email}</span>
          </div>
          <button className="icon-button" onClick={onLogout} aria-label="Log out">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </header>
        {children}
      </main>
    </div>
  );
}
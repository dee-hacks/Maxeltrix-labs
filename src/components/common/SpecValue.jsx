import React from 'react';

/* ------------------------------------------------------------------ */
/* Value helpers used across the customer and admin pages.            */
/* Data rule: never invent data. Missing values show                  */
/* "Information not provided".                                        */
/* ------------------------------------------------------------------ */
export function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return true;
  return !Number.isNaN(Number(value));
}

export function formatValue(value) {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value ?? '');
}

export const NOT_PROVIDED = 'Information not provided';

export default function SpecValue({ label, value, unit }) {
  const present = hasValue(value);
  return (
    <div className="spec-row">
      <span className="spec-label">{label}</span>
      <span className={`spec-value ${present ? '' : 'spec-muted'}`}>
        {present ? `${formatValue(value)}${unit ? ` ${unit}` : ''}` : NOT_PROVIDED}
      </span>
    </div>
  );
}

/* Groups a flat attribute list into ordered sections by group_key. */
export function groupAttributes(attributes) {
  const visible = (attributes ?? []).filter((a) => a.is_customer_visible !== false);
  const map = new Map();
  for (const attr of visible) {
    const key = attr.group_key || 'specifications';
    if (!map.has(key)) {
      map.set(key, {
        group_key: key,
        group_label: attr.group_label || 'Specifications',
        fields: [],
      });
    }
    map.get(key).fields.push(attr);
  }
  return [...map.values()];
}

/*
 * Renders a titled specification section. The section is only rendered
 * when at least one of its fields has a value, unless `always` is set.
 */
export function SpecSection({ title, children, always = false }) {
  const hasContent = always || React.Children.toArray(children).some((child) =>
    React.isValidElement(child) && child.props?.value !== undefined
      ? hasValue(child.props.value)
      : child.props?.items?.length > 0,
  );
  if (!hasContent) return null;
  return (
    <section className="spec-card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/* Renders an attribute group as a stack of spec rows. */
export function AttributeGroup({ group }) {
  const fields = (group.fields ?? []).filter((f) => hasValue(f.value));
  if (fields.length === 0) return null;
  return (
    <section className="spec-card">
      <h2>{group.group_label}</h2>
      <div className="spec-grid">
        {group.fields.map((field) => (
          <SpecValue
            key={field.id ?? field.field_key}
            label={field.label}
            value={field.value}
            unit={field.unit}
          />
        ))}
      </div>
    </section>
  );
}

/* Renders a simple checkbox list, e.g. care instructions / features. */
export function CheckList({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ul className="check-list">
      {items.map((item, index) => (
        <li key={`${String(item)}-${index}`}>
          <span aria-hidden="true">✓</span> {item}
        </li>
      ))}
    </ul>
  );
}

export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}
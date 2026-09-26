import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { loadAttributeDefinitions, loadCategories, saveAttributeDefinition } from '../../services/catalogService';

const VALUE_TYPES = ['text', 'textarea', 'number', 'boolean', 'select', 'multiline_list'];

export default function AttributeManagerPage() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [definitions, setDefinitions] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [newField, setNewField] = useState({
    field_key: '',
    label: '',
    group_key: 'specifications',
    group_label: 'Specifications',
    value_type: 'text',
    options_text: '',
    unit: '',
    is_customer_visible: true,
  });

  useEffect(() => {
    let cancelled = false;
    async function fetchCategories() {
      try {
        const rows = await loadCategories();
        if (!cancelled) setCategories(rows);
      } catch {
        /* ignore */
      }
    }
    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (selectedCategory === '') {
      setDefinitions([]);
      setStatus('ready');
      return undefined;
    }
    setStatus('loading');
    loadAttributeDefinitions(selectedCategory)
      .then((rows) => {
        if (cancelled) return;
        setDefinitions(rows);
        setStatus('ready');
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError.message);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCategory]);

  const groups = useMemo(() => {
    const map = new Map();
    definitions.forEach((d) => {
      const key = d.group_key || 'specifications';
      if (!map.has(key)) {
        map.set(key, { group_key: key, group_label: d.group_label || key, fields: [] });
      }
      map.get(key).fields.push(d);
    });
    return [...map.values()];
  }, [definitions]);

  function updateDefinition(id, patch) {
    setDefinitions((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function handleSave(definition, index) {
    setMessage('');
    setError('');
    try {
      const saved = await saveAttributeDefinition(definition);
      setDefinitions((prev) => prev.map((d, i) => (i === index ? saved : d)));
      setMessage(`Saved "${saved.label}".`);
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  async function handleAdd() {
    setMessage('');
    setError('');
    if (!newField.field_key.trim() || !newField.label.trim()) {
      setError('Field key and label are required.');
      return;
    }
    const options = newField.options_text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    try {
      await saveAttributeDefinition({
        id: null,
        category_id: selectedCategory === '' ? null : selectedCategory,
        field_key: newField.field_key.trim(),
        label: newField.label.trim(),
        group_key: newField.group_key.trim() || 'specifications',
        group_label: newField.group_label.trim() || 'Specifications',
        value_type: newField.value_type,
        options: options.length ? options : null,
        unit: newField.unit.trim() || null,
        is_required: false,
        is_customer_visible: newField.is_customer_visible,
        sort_order: definitions.length,
        is_active: true,
      });
      setNewField({
        field_key: '',
        label: '',
        group_key: 'specifications',
        group_label: 'Specifications',
        value_type: 'text',
        options_text: '',
        unit: '',
        is_customer_visible: true,
      });
      const rows = await loadAttributeDefinitions(selectedCategory === '' ? null : selectedCategory);
      setDefinitions(rows);
      setMessage('Field added.');
    } catch (addError) {
      setError(addError.message);
    }
  }
return (
    <>
      <section className="toolbar">
        <div>
          <h2>Attribute Fields</h2>
          <p>
            Define product-specific fields per category. The product form renders
            only the fields applicable to the selected category.
          </p>
        </div>
        <label className="form-field compact-select">
          <span>Field scope</span>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
          >
            <option value="">Global (all categories)</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {message ? <p className="save-note">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {status === 'loading' ? <p className="state-text">Loading fields…</p> : null}

      {status === 'ready' && selectedCategory !== '' ? (
        groups.map((group) => (
          <section className="activity-panel attribute-group" key={group.group_key}>
            <h2>{group.group_label}</h2>
            <div className="attribute-def-list">
              {group.fields.map((definition, index) => (
                <div className="attribute-def-row" key={definition.id}>
                  <input
                    className="attr-input"
                    value={definition.field_key}
                    onChange={(event) => updateDefinition(definition.id, { field_key: event.target.value })}
                    aria-label="Field key"
                  />
                  <input
                    className="attr-input"
                    value={definition.label ?? ''}
                    onChange={(event) => updateDefinition(definition.id, { label: event.target.value })}
                    aria-label="Label"
                  />
                  <select
                    className="attr-input"
                    value={definition.value_type ?? 'text'}
                    onChange={(event) => updateDefinition(definition.id, { value_type: event.target.value })}
                    aria-label="Value type"
                  >
                    {VALUE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <input
                    className="attr-input"
                    value={definition.unit ?? ''}
                    onChange={(event) => updateDefinition(definition.id, { unit: event.target.value })}
                    placeholder="Unit"
                    aria-label="Unit"
                  />
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={definition.is_customer_visible !== false}
                      onChange={(event) =>
                        updateDefinition(definition.id, { is_customer_visible: event.target.checked })
                      }
                    />
                    Visible
                  </label>
                  <button className="secondary-button" onClick={() => handleSave(definition, index)}>
                    <Save size={16} aria-hidden="true" /> Save
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))
      ) : status === 'ready' && selectedCategory === '' ? (
        <p className="state-text">Select a category to manage its fields, or use Global for common fields.</p>
      ) : null}
<section className="activity-panel">
        <h2><Plus size={18} aria-hidden="true" /> Add Field</h2>
        {selectedCategory === '' ? (
          <p className="state-text">New fields will apply to all categories.</p>
        ) : null}
        <div className="attribute-def-list add-field-row">
          <input
            className="attr-input"
            placeholder="Field key (e.g. wood_type)"
            value={newField.field_key}
            onChange={(event) => setNewField({ ...newField, field_key: event.target.value })}
          />
          <input
            className="attr-input"
            placeholder="Label (e.g. Wood Type)"
            value={newField.label}
            onChange={(event) => setNewField({ ...newField, label: event.target.value })}
          />
          <input
            className="attr-input"
            placeholder="Group key (e.g. wood)"
            value={newField.group_key}
            onChange={(event) => setNewField({ ...newField, group_key: event.target.value })}
          />
          <input
            className="attr-input"
            placeholder="Group label (e.g. Wood Information)"
            value={newField.group_label}
            onChange={(event) => setNewField({ ...newField, group_label: event.target.value })}
          />
          <select
            className="attr-input"
            value={newField.value_type}
            onChange={(event) => setNewField({ ...newField, value_type: event.target.value })}
          >
            {VALUE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            className="attr-input"
            placeholder="Unit (optional)"
            value={newField.unit}
            onChange={(event) => setNewField({ ...newField, unit: event.target.value })}
          />
          <textarea
            className="attr-input options-input"
            rows="2"
            placeholder="Options (one per line) for select fields"
            value={newField.options_text}
            onChange={(event) => setNewField({ ...newField, options_text: event.target.value })}
          />
          <button className="secondary-button" onClick={handleAdd}>
            <Plus size={16} aria-hidden="true" /> Add
          </button>
        </div>
      </section>
    </>
  );
}
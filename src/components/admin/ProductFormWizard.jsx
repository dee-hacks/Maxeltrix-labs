import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { loadAttributeDefinitions, loadCategories, loadProduct, saveProduct } from '../../services/catalogService';
import { demoSuppliers } from '../../data/demoData';
import { conditions, deliveryCategories, qualityGrades } from '../../data/demoData';

const STEPS = [
  { key: 'basic', title: 'Basic Information', hint: 'Product identity and category.' },
  { key: 'description', title: 'Description', hint: 'Customer-friendly product description.' },
  { key: 'material', title: 'Material', hint: 'Primary materials and quality.' },
  { key: 'specs', title: 'Specifications', hint: 'Dynamic fields for this category.' },
  { key: 'physical', title: 'Physical Details', hint: 'Dimensions, weight, images and variants.' },
  { key: 'quality', title: 'Quality', hint: 'Quality grade and condition.' },
  { key: 'warranty', title: 'Warranty', hint: 'Warranty period, coverage and provider.' },
  { key: 'pricing', title: 'Pricing', hint: 'Purchase, selling and MRP.' },
  { key: 'inventory', title: 'Inventory', hint: 'Stock and reorder level.' },
  { key: 'delivery', title: 'Delivery', hint: 'Packaging, delivery category and origin.' },
  { key: 'visibility', title: 'Customer Visibility', hint: 'Choose what customers can see.' },
];

function emptyForm() {
  return {
    id: null,
    sku: '',
    name: '',
    barcode: '',
    category_id: '',
    brand: '',
    model: '',
    supplier_id: '',
    short_description: '',
    detailed_description: '',
    key_features_text: '',
    image_url: '',
    thumbnail_url: '',
    images_text: '',
    attributes: {},
    attr_visibility: {},
    length_cm: '',
    width_cm: '',
    height_cm: '',
    depth_cm: '',
    net_weight_kg: '',
    gross_weight_kg: '',
    load_capacity_kg: '',
    load_capacity_label: '',
    quantity_per_pack: '',
    quantity_unit: '',
    quality_grade: 'Premium',
    condition: 'New',
    quality_notes: '',
    warranty_period: '',
    warranty_type: '',
    warranty_provider: '',
    warranty_coverage: '',
    warranty_exclusions: '',
    unit_price: '',
    selling_price: '',
    mrp: '',
    tax_percent: '18',
    stock_quantity: '',
    reorder_level: '',
    delivery_category: 'SMALL',
    estimated_delivery: '',
    package_weight_kg: '',
    package_length_cm: '',
    package_width_cm: '',
    package_height_cm: '',
    package_text: '',
    country_of_origin: '',
    material_sustainability: '',
    recycled_content: '',
    recyclable_packaging: '',
    wood_certification: '',
    eco_friendly_packaging: false,
    care_text: '',
    safety_text: '',
    assembly_required: false,
    assembly_time: '',
    tools_required: '',
    assembly_service: '',
    variants: [],
    section_visibility: {
      description: true,
      material: true,
      physical: true,
      quality: true,
      warranty: true,
      pricing: true,
      care: true,
      safety: true,
      assembly: true,
      origin: true,
      environmental: true,
      price_analysis: true,
      delivery: true,
    },
    is_active: true,
  };
}

function splitLines(text) {
  return (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(items) {
  return Array.isArray(items) ? items.join('\n') : '';
}

function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/* Small form field helpers */
function Field({ label, children, hint }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  );
}

function NumberInput({ value, onChange, placeholder }) {
  return (
    <input
      type="number"
      step="any"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
      <option value="">—</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
/* Attribute group editor: renders the dynamic fields for a group. */
function AttributeGroupEditor({ group, values, visibility, onValueChange, onVisibilityChange, heading }) {
  return (
    <section className="form-group-block">
      <h3>{heading ?? group.group_label}</h3>
      <div className="form-field-grid">
        {group.fields.map((def) => {
          const valueType = def.value_type ?? 'text';
          const value = values[def.field_key];
          const visible = visibility[def.field_key] ?? def.is_customer_visible;
          return (
            <div className="attr-field" key={def.id}>
              <Field label={def.label} hint={def.unit ? `Unit: ${def.unit}` : null}>
                {valueType === 'textarea' ? (
                  <textarea
                    rows="2"
                    value={Array.isArray(value) ? value.join(', ') : value ?? ''}
                    onChange={(event) => onValueChange(def.field_key, event.target.value)}
                  />
                ) : valueType === 'select' ? (
                  <select
                    value={Array.isArray(value) ? value[0] : value ?? ''}
                    onChange={(event) => onValueChange(def.field_key, event.target.value)}
                  >
                    <option value="">—</option>
                    {(def.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : valueType === 'number' ? (
                  <NumberInput
                    value={value}
                    onChange={(value) => onValueChange(def.field_key, value)}
                  />
                ) : (
                  <TextInput
                    value={value}
                    onChange={(value) => onValueChange(def.field_key, value)}
                  />
                )}
              </Field>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={Boolean(visible)}
                  onChange={(event) => onVisibilityChange(def.field_key, event.target.checked)}
                />
                Visible to customers
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function ProductFormWizard({ productId, onSaved, onCancel }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm());
  const [categories, setCategories] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [suppliers] = useState(demoSuppliers);
  const [status, setStatus] = useState(productId ? 'loading' : 'ready');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchMeta() {
      try {
        const cats = await loadCategories();
        if (!cancelled) setCategories(cats);
      } catch {
        /* category list is optional; the form works without it */
      }
    }
    fetchMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!form.category_id) {
      setDefinitions([]);
      return undefined;
    }
    async function fetchDefinitions() {
      try {
        const defs = await loadAttributeDefinitions(form.category_id);
        if (!cancelled) setDefinitions(defs);
      } catch {
        if (!cancelled) setDefinitions([]);
      }
    }
    fetchDefinitions();
    return () => {
      cancelled = true;
    };
  }, [form.category_id]);

  useEffect(() => {
    let cancelled = false;
    if (!productId) return undefined;
    async function loadExisting() {
      setStatus('loading');
      setError('');
      try {
        const existing = await loadProduct(productId);
        if (cancelled || !existing) return;
        const next = emptyForm();
        Object.keys(next).forEach((key) => {
          if (existing[key] !== undefined) next[key] = existing[key];
        });
        next.id = existing.id ?? null;
        next.short_description = existing.short_description ?? existing.description ?? '';
        next.detailed_description = existing.detailed_description ?? '';
        next.key_features_text = joinLines(existing.key_features ?? []);
        next.care_text = joinLines(existing.care_instructions ?? []);
        next.safety_text = joinLines(existing.safety_instructions ?? []);
        next.package_text = joinLines(existing.package_contents ?? []);
        next.image_url = existing.image_url ?? '';
        next.thumbnail_url = existing.thumbnail_url ?? '';
        next.images_text = (existing.images ?? [])
          .map((img) => img.url)
          .filter((url) => url && url !== next.image_url && url !== next.thumbnail_url)
          .join('\n');
        next.category_id = existing.category_id ?? '';
        next.supplier_id = existing.supplier_id ?? '';
        next.attributes = {};
        next.attr_visibility = {};
        (existing.attributes ?? []).forEach((attr) => {
          next.attributes[attr.field_key] = attr.value;
          next.attr_visibility[attr.field_key] = attr.is_customer_visible !== false;
        });
        next.variants = (existing.variants ?? []).map((v) => ({ ...v }));
        setForm(next);
        setStatus('ready');
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          setStatus('error');
        }
      }
    }
    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [productId]);
function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateAttribute(fieldKey, value) {
    setForm((prev) => ({ ...prev, attributes: { ...prev.attributes, [fieldKey]: value } }));
  }

  function updateAttrVisibility(fieldKey, visible) {
    setForm((prev) => ({ ...prev, attr_visibility: { ...prev.attr_visibility, [fieldKey]: visible } }));
  }

  function updateVariant(index, field, value) {
    setForm((prev) => {
      const variants = prev.variants.map((v, i) => (i === index ? { ...v, [field]: value } : v));
      return { ...prev, variants };
    });
  }

  function addVariant() {
    setForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          id: `var-new-${Date.now()}`,
          label: '',
          sku: prev.sku ? `${prev.sku}-${prev.variants.length + 1}` : '',
          colour: '',
          size: '',
          selling_price: prev.selling_price ?? '',
          mrp: prev.mrp ?? '',
          stock_quantity: '',
          net_weight_kg: '',
          length_cm: '',
          width_cm: '',
          height_cm: '',
        },
      ],
    }));
  }

  function removeVariant(index) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  }

  const groups = useMemo(() => {
    const map = new Map();
    definitions.forEach((d) => {
      if (!map.has(d.group_key)) {
        map.set(d.group_key, { group_key: d.group_key, group_label: d.group_label, fields: [] });
      }
      map.get(d.group_key).fields.push(d);
    });
    return [...map.values()];
  }, [definitions]);

  const materialGroup = useMemo(
    () => groups.find((g) => g.group_key === 'material'),
    [groups],
  );
  const specificationGroups = useMemo(
    () => groups.filter((g) => g.group_key !== 'material'),
    [groups],
  );

  function handleSave() {
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload(form, definitions);
      saveProduct(payload).then(
        (result) => {
          setSaving(false);
          onSaved(result);
        },
        (saveError) => {
          setSaving(false);
          setError(saveError.message);
        },
      );
    } catch (buildError) {
      setSaving(false);
      setError(buildError.message);
    }
  }
function buildPayload(form, definitions) {
    const attributeRows = [];
    definitions.forEach((def) => {
      const value = form.attributes[def.field_key];
      const hasValueNow =
        value !== undefined &&
        value !== null &&
        (typeof value === 'string' ? value.trim() !== '' : Array.isArray(value) ? value.length > 0 : true);
      if (!hasValueNow) return;
      attributeRows.push({
        definition_id: def.id,
        field_key: def.field_key,
        value,
        is_customer_visible: (form.attr_visibility[def.field_key] ?? def.is_customer_visible) !== false,
      });
    });

    return {
      id: form.id ?? null,
      sku: form.sku.trim(),
      name: form.name.trim(),
      barcode: form.barcode.trim() || null,
      category_id: form.category_id || null,
      supplier_id: form.supplier_id || null,
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      short_description: form.short_description.trim(),
      detailed_description: form.detailed_description.trim(),
      description: form.short_description.trim(),
      key_features: splitLines(form.key_features_text),
      image_url: form.image_url.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      care_instructions: splitLines(form.care_text),
      safety_instructions: splitLines(form.safety_text),
      attributes: attributeRows,
      variants: form.variants
        .filter((v) => v.sku && v.sku.trim())
        .map((v, index) => ({
          id: v.id ?? null,
          label: v.label || v.colour || v.size || `Variant ${index + 1}`,
          sku: v.sku.trim(),
          colour: v.colour ?? null,
          size: v.size ?? null,
          selling_price: parseNumber(v.selling_price),
          mrp: parseNumber(v.mrp),
          stock_quantity: Number(v.stock_quantity ?? 0),
          net_weight_kg: parseNumber(v.net_weight_kg),
          length_cm: parseNumber(v.length_cm),
          width_cm: parseNumber(v.width_cm),
          height_cm: parseNumber(v.height_cm),
          is_active: true,
          sort_order: index + 1,
        })),
      images: buildImages(form),
      length_cm: parseNumber(form.length_cm),
      width_cm: parseNumber(form.width_cm),
      height_cm: parseNumber(form.height_cm),
      depth_cm: parseNumber(form.depth_cm),
      net_weight_kg: parseNumber(form.net_weight_kg),
      gross_weight_kg: parseNumber(form.gross_weight_kg),
      load_capacity_kg: parseNumber(form.load_capacity_kg),
      load_capacity_label: form.load_capacity_label.trim() || null,
      quantity_per_pack: parseNumber(form.quantity_per_pack),
      quantity_unit: form.quantity_unit.trim() || null,
      quality_grade: form.quality_grade || null,
      condition: form.condition || 'New',
      quality_notes: form.quality_notes.trim() || null,
      warranty_period: form.warranty_period.trim() || null,
      warranty_type: form.warranty_type.trim() || null,
      warranty_provider: form.warranty_provider.trim() || null,
      warranty_coverage: form.warranty_coverage.trim() || null,
      warranty_exclusions: form.warranty_exclusions.trim() || null,
      unit_price: parseNumber(form.unit_price),
      selling_price: parseNumber(form.selling_price),
      mrp: parseNumber(form.mrp),
      tax_percent: parseNumber(form.tax_percent) ?? 0,
      stock_quantity: Number(form.stock_quantity ?? 0),
      reorder_level: Number(form.reorder_level ?? 0),
      delivery_category: form.delivery_category || null,
      estimated_delivery: form.estimated_delivery.trim() || null,
      package_weight_kg: parseNumber(form.package_weight_kg),
      package_length_cm: parseNumber(form.package_length_cm),
      package_width_cm: parseNumber(form.package_width_cm),
      package_height_cm: parseNumber(form.package_height_cm),
      package_contents: splitLines(form.package_text),
      country_of_origin: form.country_of_origin.trim() || null,
      material_sustainability: form.material_sustainability.trim() || null,
      recycled_content: form.recycled_content.trim() || null,
      recyclable_packaging: form.recyclable_packaging.trim() || null,
      wood_certification: form.wood_certification.trim() || null,
      eco_friendly_packaging: Boolean(form.eco_friendly_packaging),
      assembly_required: Boolean(form.assembly_required),
      assembly_time: form.assembly_time.trim() || null,
      tools_required: form.tools_required.trim() || null,
      assembly_service: form.assembly_service.trim() || null,
      is_active: form.is_active !== false,
    };
  }

function buildImages(form) {
    const images = [];
    if (form.image_url.trim()) {
      images.push({ url: form.image_url.trim(), alt_text: form.sku, sort_order: 1 });
    }
    let order = 2;
    splitLines(form.images_text).forEach((url) => {
      if (url !== form.image_url.trim()) {
        images.push({ url, alt_text: form.sku, sort_order: order });
        order += 1;
      }
    });
    return images;
  }
function renderStepContent() {
    switch (STEPS[step].key) {
      case 'basic':
        return <BasicStep form={form} categories={categories} suppliers={suppliers} updateField={updateField} />;
      case 'description':
        return <DescriptionStep form={form} updateField={updateField} />;
      case 'material':
        if (!materialGroup) return <p className="state-text">No material fields configured for this category.</p>;
        return (
          <AttributeGroupEditor
            group={materialGroup}
            values={form.attributes}
            visibility={form.attr_visibility}
            onValueChange={updateAttribute}
            onVisibilityChange={updateAttrVisibility}
          />
        );
      case 'specs':
        if (specificationGroups.length === 0) {
          return <p className="state-text">No specification fields configured for this category. Add them from the Attributes screen.</p>;
        }
        return specificationGroups.map((group) => (
          <AttributeGroupEditor
            key={group.group_key}
            group={group}
            values={form.attributes}
            visibility={form.attr_visibility}
            onValueChange={updateAttribute}
            onVisibilityChange={updateAttrVisibility}
          />
        ));
      case 'physical':
        return (
          <PhysicalStep
            form={form}
            updateField={updateField}
            variants={form.variants}
            updateVariant={updateVariant}
            addVariant={addVariant}
            removeVariant={removeVariant}
          />
        );
      case 'quality':
        return <QualityStep form={form} updateField={updateField} />;
      case 'warranty':
        return <WarrantyStep form={form} updateField={updateField} />;
      case 'pricing':
        return <PricingStep form={form} updateField={updateField} />;
      case 'inventory':
        return <InventoryStep form={form} updateField={updateField} />;
      case 'delivery':
        return <DeliveryStep form={form} updateField={updateField} />;
      case 'visibility':
        return (
          <VisibilityStep
            groups={groups}
            form={form}
            updateAttrVisibility={updateAttrVisibility}
            updateField={updateField}
          />
        );
      default:
        return null;
    }
  }
const currentStep = STEPS[step];
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  if (status === 'loading') return <p className="state-text">Loading product…</p>;
  if (status === 'error') return <p className="state-text error">{error}</p>;

  return (
    <div className="wizard">
      <header className="wizard-header">
        <div>
          <p className="eyebrow">{productId ? 'Edit Product' : 'New Product'}</p>
          <h2>{productId ? form.name || `Editing ${form.sku}` : 'Create a Product'}</h2>
          <p className="wizard-hint">
            Step {step + 1} of {STEPS.length}: {currentStep.title} — {currentStep.hint}
          </p>
        </div>
        <div className="wizard-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{progress}%</span>
        </div>
      </header>

      <nav className="step-tabs" aria-label="Form steps">
        {STEPS.map((item, index) => (
          <button
            type="button"
            key={item.key}
            className={`step-tab ${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`}
            onClick={() => setStep(index)}
          >
            <span className="step-number">{index + 1}</span>
            <span className="step-title">{item.title}</span>
          </button>
        ))}
      </nav>

      <div className="wizard-body">{renderStepContent()}</div>

      {error ? <p className="form-error">{error}</p> : null}

      <footer className="wizard-footer">
        <div>
          {step > 0 ? (
            <button className="secondary-button" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft size={18} aria-hidden="true" /> Back
            </button>
          ) : null}
          <button className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
        <div>
          {step < STEPS.length - 1 ? (
            <button
              className="primary-button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 0 && !form.name.trim()}
            >
              Next <ArrowRight size={18} aria-hidden="true" />
            </button>
          ) : (
            <button
              className="primary-button"
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.sku.trim()}
            >
              <Save size={18} aria-hidden="true" />
              {saving ? 'Saving…' : productId ? 'Save Changes' : 'Create Product'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* Step forms                                                          */
/* ------------------------------------------------------------------ */
function BasicStep({ form, categories, suppliers, updateField }) {
  return (
    <div className="form-group-block">
      <h3>Step 1 · Basic Information</h3>
      <div className="form-field-grid">
        <Field label="Product Name" hint="Required">
          <TextInput value={form.name} onChange={(value) => updateField('name', value)} placeholder="e.g. Premium Solid Sheesham Wood Dining Table" />
        </Field>
        <Field label="SKU" hint="Required, unique">
          <TextInput value={form.sku} onChange={(value) => updateField('sku', value)} placeholder="e.g. FRN-TABLE-006" />
        </Field>
        <Field label="Barcode">
          <TextInput value={form.barcode} onChange={(value) => updateField('barcode', value)} placeholder="Scannable barcode value" />
        </Field>
        <Field label="Category">
          <select value={form.category_id ?? ''} onChange={(event) => updateField('category_id', event.target.value)}>
            <option value="">Select category…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brand">
          <TextInput value={form.brand} onChange={(value) => updateField('brand', value)} placeholder="e.g. ABC Furniture" />
        </Field>
        <Field label="Model">
          <TextInput value={form.model} onChange={(value) => updateField('model', value)} placeholder="e.g. DT-6-SHM" />
        </Field>
        <Field label="Supplier">
          <select value={form.supplier_id ?? ''} onChange={(event) => updateField('supplier_id', event.target.value)}>
            <option value="">Select supplier…</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

function DescriptionStep({ form, updateField }) {
  return (
    <div className="form-group-block">
      <h3>Step 2 · Description</h3>
      <div className="form-field-grid">
        <Field label="Short Description" hint="One or two lines shown at the top of the product page.">
          <textarea
            rows="2"
            value={form.short_description}
            onChange={(event) => updateField('short_description', event.target.value)}
          />
        </Field>
        <Field label="Detailed Description" hint="What the product is, materials, construction, finish, usage and care.">
          <textarea
            rows="8"
            value={form.detailed_description}
            onChange={(event) => updateField('detailed_description', event.target.value)}
          />
        </Field>
        <Field label="Key Features" hint="One feature per line.">
          <textarea
            rows="6"
            value={form.key_features_text}
            onChange={(event) => updateField('key_features_text', event.target.value)}
          />
        </Field>
        <Field label="Care Instructions" hint="One instruction per line.">
          <textarea
            rows="5"
            value={form.care_text}
            onChange={(event) => updateField('care_text', event.target.value)}
          />
        </Field>
        <Field label="Safety Instructions" hint="One instruction per line.">
          <textarea
            rows="5"
            value={form.safety_text}
            onChange={(event) => updateField('safety_text', event.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}
function PhysicalStep({ form, updateField, variants, updateVariant, addVariant, removeVariant }) {
  return (
    <div>
      <div className="form-group-block">
        <h3>Step 5 · Physical Details</h3>
        <div className="form-field-grid">
          <Field label="Length (cm)"><NumberInput value={form.length_cm} onChange={(value) => updateField('length_cm', value)} /></Field>
          <Field label="Width (cm)"><NumberInput value={form.width_cm} onChange={(value) => updateField('width_cm', value)} /></Field>
          <Field label="Height (cm)"><NumberInput value={form.height_cm} onChange={(value) => updateField('height_cm', value)} /></Field>
          <Field label="Depth (cm)"><NumberInput value={form.depth_cm} onChange={(value) => updateField('depth_cm', value)} /></Field>
          <Field label="Net Weight (kg)"><NumberInput value={form.net_weight_kg} onChange={(value) => updateField('net_weight_kg', value)} /></Field>
          <Field label="Gross Weight (kg)"><NumberInput value={form.gross_weight_kg} onChange={(value) => updateField('gross_weight_kg', value)} /></Field>
          <Field label="Load Capacity (kg)"><NumberInput value={form.load_capacity_kg} onChange={(value) => updateField('load_capacity_kg', value)} /></Field>
          <Field label="Load Capacity Label">
            <TextInput value={form.load_capacity_label} onChange={(value) => updateField('load_capacity_label', value)} placeholder="e.g. Maximum Load" />
          </Field>
          <Field label="Quantity per Pack"><NumberInput value={form.quantity_per_pack} onChange={(value) => updateField('quantity_per_pack', value)} /></Field>
          <Field label="Quantity Unit">
            <TextInput value={form.quantity_unit} onChange={(value) => updateField('quantity_unit', value)} placeholder="e.g. Table, Piece, kg, Metre" />
          </Field>
        </div>
        <h3>Images</h3>
        <div className="form-field-grid">
          <Field label="Main Image URL">
            <TextInput value={form.image_url} onChange={(value) => updateField('image_url', value)} placeholder="https://…" />
          </Field>
          <Field label="Thumbnail URL">
            <TextInput value={form.thumbnail_url} onChange={(value) => updateField('thumbnail_url', value)} placeholder="https://…" />
          </Field>
          <Field label="Additional Images" hint="One URL per line.">
            <textarea rows="3" value={form.images_text} onChange={(event) => updateField('images_text', event.target.value)} />
          </Field>
        </div>
      </div>

      <div className="form-group-block">
        <h3>Variants (colour / size)</h3>
        <p className="wizard-hint">
          Variants update the SKU, price, weight, dimensions and availability shown to customers.
        </p>
        {variants.length === 0 ? (
          <p className="state-text">No variants — this product will be sold as a single SKU.</p>
        ) : (
          <div className="variant-editor">
            {variants.map((variant, index) => (
              <div className="variant-editor-row" key={variant.id ?? index}>
                <input
                  type="text"
                  placeholder="Label"
                  value={variant.label ?? ''}
                  onChange={(event) => updateVariant(index, 'label', event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Colour"
                  value={variant.colour ?? ''}
                  onChange={(event) => updateVariant(index, 'colour', event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Size"
                  value={variant.size ?? ''}
                  onChange={(event) => updateVariant(index, 'size', event.target.value)}
                />
                <input
                  type="text"
                  placeholder="SKU"
                  value={variant.sku ?? ''}
                  onChange={(event) => updateVariant(index, 'sku', event.target.value)}
                />
                <input
                  type="number"
                  placeholder="Selling ₹"
                  value={variant.selling_price ?? ''}
                  onChange={(event) => updateVariant(index, 'selling_price', event.target.value)}
                />
                <input
                  type="number"
                  placeholder="Stock"
                  value={variant.stock_quantity ?? ''}
                  onChange={(event) => updateVariant(index, 'stock_quantity', event.target.value)}
                />
                <input
                  type="number"
                  placeholder="Wt kg"
                  value={variant.net_weight_kg ?? ''}
                  onChange={(event) => updateVariant(index, 'net_weight_kg', event.target.value)}
                />
                <button type="button" className="icon-button danger" onClick={() => removeVariant(index)} aria-label="Remove variant">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <button className="secondary-button" onClick={addVariant}>
          + Add Variant
        </button>
      </div>
    </div>
  );
}
function QualityStep({ form, updateField }) {
  return (
    <div className="form-group-block">
      <h3>Step 6 · Quality & Condition</h3>
      <div className="form-field-grid">
        <Field label="Quality Grade" hint="An actual configured product attribute — never inferred automatically.">
          <SelectInput value={form.quality_grade} onChange={(value) => updateField('quality_grade', value)} options={qualityGrades} />
        </Field>
        <Field label="Condition">
          <SelectInput value={form.condition} onChange={(value) => updateField('condition', value)} options={conditions} />
        </Field>
        <Field label="Quality Notes">
          <textarea rows="3" value={form.quality_notes} onChange={(event) => updateField('quality_notes', event.target.value)} />
        </Field>
      </div>
    </div>
  );
}

function WarrantyStep({ form, updateField }) {
  return (
    <div className="form-group-block">
      <h3>Step 7 · Warranty</h3>
      <div className="form-field-grid">
        <Field label="Warranty Period"><TextInput value={form.warranty_period} onChange={(value) => updateField('warranty_period', value)} placeholder="e.g. 2 Years" /></Field>
        <Field label="Warranty Type"><TextInput value={form.warranty_type} onChange={(value) => updateField('warranty_type', value)} placeholder="e.g. Manufacturer Warranty" /></Field>
        <Field label="Warranty Provider"><TextInput value={form.warranty_provider} onChange={(value) => updateField('warranty_provider', value)} /></Field>
        <Field label="Coverage"><TextInput value={form.warranty_coverage} onChange={(value) => updateField('warranty_coverage', value)} placeholder="e.g. Manufacturing defects" /></Field>
        <Field label="Exclusions"><TextInput value={form.warranty_exclusions} onChange={(value) => updateField('warranty_exclusions', value)} placeholder="e.g. Misuse or unauthorized modification" /></Field>
      </div>
    </div>
  );
}

function PricingStep({ form, updateField }) {
  return (
    <div className="form-group-block">
      <h3>Step 8 · Pricing</h3>
      <div className="form-field-grid">
        <Field label="Purchase Price (unit)"><NumberInput value={form.unit_price} onChange={(value) => updateField('unit_price', value)} /></Field>
        <Field label="Selling Price"><NumberInput value={form.selling_price} onChange={(value) => updateField('selling_price', value)} /></Field>
        <Field label="MRP"><NumberInput value={form.mrp} onChange={(value) => updateField('mrp', value)} /></Field>
        <Field label="Tax %"><NumberInput value={form.tax_percent} onChange={(value) => updateField('tax_percent', value)} /></Field>
      </div>
    </div>
  );
}

function InventoryStep({ form, updateField }) {
  return (
    <div className="form-group-block">
      <h3>Step 9 · Inventory</h3>
      <div className="form-field-grid">
        <Field label="Stock Quantity"><NumberInput value={form.stock_quantity} onChange={(value) => updateField('stock_quantity', value)} /></Field>
        <Field label="Reorder Level"><NumberInput value={form.reorder_level} onChange={(value) => updateField('reorder_level', value)} /></Field>
        <Field label="Active in catalog">
          <label className="inline-check">
            <input type="checkbox" checked={form.is_active !== false} onChange={(event) => updateField('is_active', event.target.checked)} />
            Show this product to customers
          </label>
        </Field>
      </div>
    </div>
  );
}
function DeliveryStep({ form, updateField }) {
  const weightKg = Number(form.package_weight_kg ?? form.net_weight_kg ?? 0);
  const suggestedCategory =
    weightKg === 0 ? 'SMALL' : weightKg <= 10 ? 'SMALL' : weightKg <= 25 ? 'MEDIUM' : weightKg <= 60 ? 'LARGE' : 'HEAVY';
  return (
    <div className="form-group-block">
      <h3>Step 10 · Delivery & Packaging</h3>
      <div className="form-field-grid">
        <Field label="Delivery Category">
          <SelectInput value={form.delivery_category} onChange={(value) => updateField('delivery_category', value)} options={deliveryCategories} />
        </Field>
        <Field label="Estimated Delivery"><TextInput value={form.estimated_delivery} onChange={(value) => updateField('estimated_delivery', value)} placeholder="e.g. 2-3 Days" /></Field>
        <Field label="Package Weight (kg)"><NumberInput value={form.package_weight_kg} onChange={(value) => updateField('package_weight_kg', value)} /></Field>
        <Field label="Package Length (cm)"><NumberInput value={form.package_length_cm} onChange={(value) => updateField('package_length_cm', value)} /></Field>
        <Field label="Package Width (cm)"><NumberInput value={form.package_width_cm} onChange={(value) => updateField('package_width_cm', value)} /></Field>
        <Field label="Package Height (cm)"><NumberInput value={form.package_height_cm} onChange={(value) => updateField('package_height_cm', value)} /></Field>
        <Field label="Package Contents" hint="One item per line.">
          <textarea rows="4" value={form.package_text} onChange={(event) => updateField('package_text', event.target.value)} />
        </Field>
        <Field label="Country of Origin"><TextInput value={form.country_of_origin} onChange={(value) => updateField('country_of_origin', value)} /></Field>
        <Field label="Material Sustainability"><TextInput value={form.material_sustainability} onChange={(value) => updateField('material_sustainability', value)} /></Field>
        <Field label="Recycled Content"><TextInput value={form.recycled_content} onChange={(value) => updateField('recycled_content', value)} /></Field>
        <Field label="Recyclable Packaging"><TextInput value={form.recyclable_packaging} onChange={(value) => updateField('recyclable_packaging', value)} /></Field>
        <Field label="Wood Certification"><TextInput value={form.wood_certification} onChange={(value) => updateField('wood_certification', value)} /></Field>
        <Field label="Assembly Required">
          <label className="inline-check">
            <input type="checkbox" checked={form.assembly_required} onChange={(event) => updateField('assembly_required', event.target.checked)} />
            Requires assembly
          </label>
        </Field>
        <Field label="Assembly Time"><TextInput value={form.assembly_time} onChange={(value) => updateField('assembly_time', value)} placeholder="e.g. 30-45 minutes" /></Field>
        <Field label="Tools Required"><TextInput value={form.tools_required} onChange={(value) => updateField('tools_required', value)} placeholder="e.g. Basic screwdriver" /></Field>
        <Field label="Assembly Service"><TextInput value={form.assembly_service} onChange={(value) => updateField('assembly_service', value)} placeholder="Available / Not Available" /></Field>
      </div>
      <section className="delivery-summary">
        <span className="delivery-summary-icon" aria-hidden="true">🚚</span>
        <div>
          <strong>Delivery Review</strong>
          <p>
            Package weight {form.package_weight_kg || form.net_weight_kg || '—'} kg. Suggested delivery
            category based on weight: <strong>{suggestedCategory}</strong>.
          </p>
        </div>
      </section>
    </div>
  );
}

function VisibilityStep({ groups, form, updateAttrVisibility, updateField }) {
  return (
    <div className="form-group-block">
      <h3>Step 11 · Customer Visibility</h3>
      <p className="wizard-hint">Choose which information customers can see on the product page.</p>

      <h3>Attribute Fields</h3>
      {groups.map((group) => (
        <div className="visibility-group" key={group.group_key}>
          <h4>{group.group_label}</h4>
          <div className="visibility-row">
            {group.fields.map((def) => (
              <label className="inline-check" key={def.id}>
                <input
                  type="checkbox"
                  checked={(form.attr_visibility[def.field_key] ?? def.is_customer_visible) !== false}
                  onChange={(event) => updateAttrVisibility(def.field_key, event.target.checked)}
                />
                {def.label}
              </label>
            ))}
          </div>
        </div>
      ))}

      <h3>Sections</h3>
      <div className="visibility-row">
        {Object.entries(form.section_visibility).map(([key, visible]) => (
          <label className="inline-check" key={key}>
            <input
              type="checkbox"
              checked={visible !== false}
              onChange={(event) => updateField('section_visibility', { ...form.section_visibility, [key]: event.target.checked })}
            />
            {key.replace(/_/g, ' ')}
          </label>
        ))}
      </div>
    </div>
  );
}
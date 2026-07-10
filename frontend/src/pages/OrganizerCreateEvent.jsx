import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import SectionHeader from '../components/SectionHeader.jsx';

const emptyField = { label: '', type: 'text', required: false, options: '' };
const emptyVariantGroup = { name: '', options: '' };

const toLocalDatetime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const OrganizerCreateEvent = () => {
  const { id: editId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(editId);
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'normal',
    eligibility: 'both',
    registrationDeadline: '',
    startDate: '',
    endDate: '',
    registrationLimit: 0,
    registrationFee: 0,
    saleStartDate: '',
    saleEndDate: '',
    tags: '',
    stock: '',
    purchaseLimit: 1,
    itemName: '',
    teamRegistration: false,
    maxTeamSize: 2,
  });
  const [fields, setFields] = useState([emptyField]);
  const [variantGroups, setVariantGroups] = useState([emptyVariantGroup]);
  const [message, setMessage] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [formLocked, setFormLocked] = useState(false);

  // Load existing event data in edit mode
  useEffect(() => {
    if (!editId) return;
    const load = async () => {
      setLoadingEdit(true);
      try {
        const res = await api.get(`/events/${editId}`);
        const ev = res.data.event;
        setForm({
          name: ev.name || '',
          description: ev.description || '',
          type: ev.type || 'normal',
          eligibility: ev.eligibility || 'both',
          registrationDeadline: toLocalDatetime(ev.registrationDeadline),
          startDate: toLocalDatetime(ev.startDate),
          endDate: toLocalDatetime(ev.endDate),
          registrationLimit: ev.registrationLimit || 0,
          registrationFee: ev.registrationFee || 0,
          saleStartDate: toLocalDatetime(ev.saleStartDate),
          saleEndDate: toLocalDatetime(ev.saleEndDate),
          tags: (ev.tags || []).join(', '),
          stock: ev.stock || '',
          purchaseLimit: ev.purchaseLimit || 1,
          itemName: ev.merchandiseVariants?.[0]?.name || '',
          teamRegistration: !!ev.teamRegistration,
          maxTeamSize: ev.maxTeamSize || 2,
        });
        setFormLocked(!!ev.formLocked);
        if (ev.customFormSchema?.length) {
          setFields(ev.customFormSchema.map((f) => ({
            label: f.label || '',
            type: f.type || 'text',
            required: !!f.required,
            options: (f.options || []).join(', '),
          })));
        }
        if (ev.variants?.length) {
          setVariantGroups(ev.variants.map((v) => ({
            name: v.name || '',
            options: (v.options || []).join(', '),
          })));
        }
      } catch (err) {
        setMessage(err.response?.data?.message || 'Failed to load event for editing');
      } finally {
        setLoadingEdit(false);
      }
    };
    load();
  }, [editId]);

  const onChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setForm({ ...form, [name]: inputType === 'checkbox' ? checked : value });
  };

  const updateField = (idx, patch) => {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const addField = () => setFields((prev) => [...prev, emptyField]);
  const removeField = (idx) => setFields((prev) => prev.filter((_, i) => i !== idx));
  const moveField = (idx, dir) => {
    setFields((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const updateVariantGroup = (idx, patch) => {
    setVariantGroups((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };
  const addVariantGroup = () => setVariantGroups((prev) => [...prev, emptyVariantGroup]);
  const removeVariantGroup = (idx) => setVariantGroups((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    setMessage('');
    try {
      const isMerchandise = form.type === 'merchandise';
      const payload = {
        name: form.name,
        description: form.description,
        type: form.type,
        eligibility: form.eligibility,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        customFormSchema: fields
          .filter((f) => f.label)
          .map((f) => ({
            label: f.label,
            type: f.type,
            required: f.required,
            options: f.options
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean),
          })),
      };

      if (isMerchandise) {
        const itemStock = Number(form.stock) || 0;
        const itemLimit = Number(form.purchaseLimit) || 1;
        payload.saleStartDate = form.saleStartDate || null;
        payload.saleEndDate = form.saleEndDate || null;
        payload.stock = itemStock;
        payload.purchaseLimit = itemLimit;
        payload.merchandiseVariants = [{
          name: form.itemName.trim() || 'Item',
          price: 0,
          stock: itemStock,
          purchaseLimitPerUser: itemLimit,
        }];
        payload.variants = variantGroups
          .filter((v) => v.name.trim())
          .map((v) => ({
            name: v.name.trim(),
            options: v.options.split(',').map((o) => o.trim()).filter(Boolean),
          }));
      } else {
        payload.registrationDeadline = form.registrationDeadline || null;
        payload.startDate = form.startDate || null;
        payload.endDate = form.endDate || null;
        payload.registrationLimit = Number(form.registrationLimit) || 0;
        payload.registrationFee = Number(form.registrationFee) || 0;
        payload.teamRegistration = !!form.teamRegistration;
        if (form.teamRegistration) {
          payload.maxTeamSize = Number(form.maxTeamSize) || 2;
        } else {
          payload.maxTeamSize = null;
        }
      }

      if (isEdit) {
        const res = await api.patch(`/events/${editId}`, payload);
        setMessage(`Updated event ${res.data.event.name}`);
        setTimeout(() => navigate(`/organizer/events/${editId}`), 1000);
      } else {
        const res = await api.post('/events', payload);
        setMessage(`Created event ${res.data.event.name}`);
      }
    } catch (err) {
      const details = err.response?.data?.details;
      setMessage(details?.length ? details.join(' | ') : err.response?.data?.message || (isEdit ? 'Update failed' : 'Create failed'));
    }
  };

  return (
    <PageContainer title={isEdit ? 'Edit Event' : 'Create Event'}>
      {loadingEdit && <p className="muted">Loading event data...</p>}
      <Card>
        <SectionHeader title="Basics" subtitle="Core details of your event" />
        <div className="stack">
          <label>Name</label>
          <input name="name" value={form.name} onChange={onChange} />
          <label>Description</label>
          <textarea name="description" value={form.description} onChange={onChange} />
          <label>Type</label>
          <select name="type" value={form.type} onChange={onChange}>
            <option value="normal">Normal</option>
            <option value="merchandise">Merchandise</option>
          </select>
          <label>Eligibility</label>
          <select name="eligibility" value={form.eligibility} onChange={onChange}>
            <option value="both">IIIT + Non-IIIT</option>
            <option value="iiit">IIIT participants only</option>
            <option value="non-iiit">Non-IIIT participants only</option>
          </select>

          {form.type === 'normal' && (
            <>
              <label>Registration Deadline</label>
              <input name="registrationDeadline" type="datetime-local" value={form.registrationDeadline} onChange={onChange} />
              <label>Start Date</label>
              <input name="startDate" type="datetime-local" value={form.startDate} onChange={onChange} />
              <label>End Date</label>
              <input name="endDate" type="datetime-local" value={form.endDate} onChange={onChange} />
              <label>Registration Limit</label>
              <input name="registrationLimit" type="number" value={form.registrationLimit} onChange={onChange} />
              <label>Registration Fee</label>
              <input name="registrationFee" type="number" value={form.registrationFee} onChange={onChange} />
              <label className="checkbox" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  name="teamRegistration"
                  type="checkbox"
                  checked={form.teamRegistration}
                  onChange={onChange}
                />
                Require team-based registration (participants must form a team to register)
              </label>
              {form.teamRegistration && (
                <>
                  <label>Max Team Size *</label>
                  <input
                    name="maxTeamSize"
                    type="number"
                    min={2}
                    max={20}
                    value={form.maxTeamSize}
                    onChange={onChange}
                  />
                </>
              )}
            </>
          )}
          {form.type === 'merchandise' && (
            <>
              <label>Sale Start Date</label>
              <input name="saleStartDate" type="datetime-local" value={form.saleStartDate} onChange={onChange} />
              <label>Sale End Date</label>
              <input name="saleEndDate" type="datetime-local" value={form.saleEndDate} onChange={onChange} />
            </>
          )}
          <label>Tags (comma separated)</label>
          <input name="tags" value={form.tags} onChange={onChange} />
        </div>
      </Card>

      <Card>
        <SectionHeader title="Custom Registration Form" subtitle="Add fields participants must fill" />
        {fields.map((f, idx) => (
          <div key={idx} className="card inline">
            <input
              placeholder="Field label"
              value={f.label}
              onChange={(e) => updateField(idx, { label: e.target.value })}
            />
            <select value={f.type} onChange={(e) => updateField(idx, { type: e.target.value })}>
              <option value="text">Text</option>
              <option value="dropdown">Dropdown</option>
              <option value="checkbox">Checkbox</option>
              <option value="file">File</option>
            </select>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={f.required}
                onChange={(e) => updateField(idx, { required: e.target.checked })}
              />
              Required
            </label>
            {f.type === 'dropdown' && (
              <input
                placeholder="Options (comma separated)"
                value={f.options}
                onChange={(e) => updateField(idx, { options: e.target.value })}
              />
            )}
            <div className="h-stack">
              <button type="button" onClick={() => moveField(idx, -1)}>
                ↑
              </button>
              <button type="button" onClick={() => moveField(idx, 1)}>
                ↓
              </button>
              <button type="button" onClick={() => removeField(idx)}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addField}>
          Add Field
        </button>
      </Card>

      {form.type === 'merchandise' && (
        <Card>
          <SectionHeader title="Merchandise" subtitle="Stock, limits, and variant attributes (e.g. Size, Color)" />
          <div className="stack">
            <label>Item Name</label>
            <input name="itemName" value={form.itemName} onChange={onChange} placeholder="e.g. Felicity T-Shirt" />
            <label>Stock Quantity</label>
            <input name="stock" type="number" min={0} value={form.stock} onChange={onChange} />
            <label>Purchase Limit per Participant</label>
            <input name="purchaseLimit" type="number" min={1} value={form.purchaseLimit} onChange={onChange} />
          </div>

          <h4 style={{ marginTop: '1rem' }}>Variant Attributes</h4>
          <p className="muted">Define attribute groups like Size or Color; options are comma separated.</p>
          {variantGroups.map((v, idx) => (
            <div key={idx} className="card inline">
              <input
                placeholder="Attribute name (e.g., Size)"
                value={v.name}
                onChange={(e) => updateVariantGroup(idx, { name: e.target.value })}
              />
              <input
                placeholder="Options (comma separated, e.g., S,M,L)"
                value={v.options}
                onChange={(e) => updateVariantGroup(idx, { options: e.target.value })}
              />
              <button type="button" onClick={() => removeVariantGroup(idx)}>Remove</button>
            </div>
          ))}
          <button type="button" onClick={addVariantGroup}>Add Variant Attribute</button>
        </Card>
      )}

      <div className="form-actions">
        <button onClick={submit}>{isEdit ? 'Save Changes' : 'Create (Draft)'}</button>
      </div>
      {message && <p>{message}</p>}
    </PageContainer>
  );
};

export default OrganizerCreateEvent;

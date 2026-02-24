import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

const OrganizerForgotPassword = () => {
  const [form, setForm] = useState({ email: '', reason: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [message, setMessage] = useState('');

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await api.post('/auth/organizer-forgot-password', form);
      setMessage(res.data.message);
      setStatus('done');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit request. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="auth-card">
        <h2>Request Submitted</h2>
        <p style={{ color: 'var(--success, green)', marginTop: '0.5rem' }}>{message}</p>
        <p style={{ marginTop: '1rem' }} className="muted">
          An admin will review your request and provide new credentials. You may close this page.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h2>Organizer — Forgot Password</h2>
      <p className="muted" style={{ marginBottom: '1rem' }}>
        Requests are reviewed by an admin. You will receive new credentials once approved.
      </p>
      <form onSubmit={onSubmit} className="stack">
        <label>Organizer Email *</label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          required
          placeholder="your@email.com"
          disabled={status === 'loading'}
        />

        <label>Reason (optional)</label>
        <textarea
          name="reason"
          value={form.reason}
          onChange={onChange}
          rows={3}
          placeholder="e.g. Forgot my password, locked out of account"
          disabled={status === 'loading'}
          style={{ resize: 'vertical', fontFamily: 'inherit', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border, #ccc)' }}
        />

        {status === 'error' && <p className="error">{message}</p>}

        <div className="form-actions">
          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Submitting…' : 'Request Reset'}
          </button>
        </div>
      </form>

      <p style={{ marginTop: '1rem' }}>
        <Link to="/login">Back to Login</Link>
      </p>
    </div>
  );
};

export default OrganizerForgotPassword;

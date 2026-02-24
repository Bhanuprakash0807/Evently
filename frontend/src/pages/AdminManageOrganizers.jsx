import React, { useEffect, useState } from 'react';
import api from '../api/client.js';

const AdminManageOrganizers = () => {
  const [orgs, setOrgs] = useState([]);
  const [form, setForm] = useState({ name: '', category: '', description: '', contactEmail: '', contactNumber: '' });
  const [message, setMessage] = useState('');
  const [credModal, setCredModal] = useState({ open: false, email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/organizers');
      setOrgs(res.data.organizers || []);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to load organizers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const create = async () => {
    setMessage('');
    try {
      const res = await api.post('/admin/organizers', form);
      setForm({ name: '', category: '', description: '', contactEmail: '', contactNumber: '' });
      setCredModal({ open: true, email: res.data.credentials.email, password: res.data.credentials.password });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Create failed');
    }
  };

  const disable = async (id) => {
    setMessage('');
    try {
      await api.patch(`/admin/organizers/${id}/disable`);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Disable failed');
    }
  };

  const enable = async (id) => {
    setMessage('');
    try {
      await api.patch(`/admin/organizers/${id}/enable`);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Enable failed');
    }
  };

  const del = async (id) => {
    setMessage('');
    try {
      await api.delete(`/admin/organizers/${id}`);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Delete failed');
    }
  };

  const copyCreds = async () => {
    try {
      await navigator.clipboard.writeText(`Email: ${credModal.email}\nPassword: ${credModal.password}`);
      setMessage('Credentials copied');
    } catch (e) {
      setMessage('Copy failed');
    }
  };

  const downloadCreds = () => {
    const blob = new Blob([
      `Organizer Credentials\nEmail: ${credModal.email}\nPassword: ${credModal.password}\n`,
    ]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organizer-credentials.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="layout">
      <h2>Manage Organizers</h2>

      <div className="card stack">
        <h4>Create Organizer (email + temp password auto-generated)</h4>
        <input name="name" placeholder="Organizer Name" value={form.name} onChange={onChange} />
        <input name="category" placeholder="Category" value={form.category} onChange={onChange} />
        <textarea name="description" placeholder="Description" value={form.description} onChange={onChange} />
        <input name="contactEmail" placeholder="Contact Email" value={form.contactEmail} onChange={onChange} />
        <input name="contactNumber" placeholder="Contact Phone" value={form.contactNumber} onChange={onChange} />
        <button onClick={create}>Create Organizer</button>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Login Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="5">Loading...</td>
                </tr>
              )}
              {!loading && !orgs.length && (
                <tr>
                  <td colSpan="5">No organizers yet.</td>
                </tr>
              )}
              {!loading &&
                orgs.map((o) => (
                  <tr key={o.id}>
                    <td>{o.name}</td>
                    <td>{o.category || '-'}</td>
                    <td>{o.email}</td>
                    <td>{o.isActive ? 'Active' : 'Disabled'}</td>
                    <td className="h-stack">
                      <button onClick={() => disable(o.id)} disabled={!o.isActive}>Disable</button>
                      <button onClick={() => enable(o.id)} disabled={o.isActive}>Enable</button>
                      <button onClick={() => del(o.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {message && <p>{message}</p>}

      {credModal.open && (
        <div className="modal">
          <div className="modal-content">
            <h4>Organizer Credentials</h4>
            <p>Email: {credModal.email}</p>
            <p>Password: {credModal.password}</p>
            <div className="h-stack">
              <button onClick={copyCreds}>Copy</button>
              <button onClick={downloadCreds}>Download .txt</button>
              <button onClick={() => setCredModal({ open: false, email: '', password: '' })}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManageOrganizers;

import React, { useEffect, useState } from 'react';
import api from '../api/client.js';

const AdminPasswordResets = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [credModal, setCredModal] = useState({ open: false, email: '', password: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/password-requests');
      setRequests(res.data.requests || []);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id) => {
    setMessage('');
    try {
      const res = await api.patch(`/admin/password-requests/${id}/approve`);
      setCredModal({ open: true, email: res.data.credentials.email, password: res.data.credentials.password });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Approve failed');
    }
  };

  const reject = async (id) => {
    const adminComment = prompt('Add rejection comment');
    if (adminComment === null) return;
    setMessage('');
    try {
      await api.patch(`/admin/password-requests/${id}/reject`, { adminComment });
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Reject failed');
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
    a.download = 'password-reset-credentials.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="layout">
      <h2>Password Reset Requests</h2>
      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Organizer</th>
                <th>Email</th>
                <th>Reason</th>
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
              {!loading && !requests.length && (
                <tr>
                  <td colSpan="5">No requests.</td>
                </tr>
              )}
              {!loading &&
                requests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.organizerName}</td>
                    <td>{r.organizerEmail}</td>
                    <td>{r.reason}</td>
                    <td>{r.status}</td>
                    <td className="h-stack">
                      {r.status === 'pending' && (
                        <>
                          <button onClick={() => approve(r.id)}>Approve</button>
                          <button onClick={() => reject(r.id)}>Reject</button>
                        </>
                      )}
                      {r.status !== 'pending' && <span className="muted">Processed</span>}
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
            <h4>New Password</h4>
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

export default AdminPasswordResets;

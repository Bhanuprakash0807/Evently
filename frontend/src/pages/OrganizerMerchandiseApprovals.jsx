import React, { useEffect, useState } from 'react';
import api from '../api/client.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import SectionHeader from '../components/SectionHeader.jsx';

const STATUS_TABS = [
  { label: 'All',      value: '' },
  { label: 'Pending',  value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const statusStyle = {
  pending:  { background: '#fff3cd', color: '#856404', border: '1px solid #ffc107', borderRadius: '4px', padding: '2px 10px', fontWeight: 600, fontSize: '0.8rem' },
  approved: { background: '#d1e7dd', color: '#0a3622', border: '1px solid #0f5132', borderRadius: '4px', padding: '2px 10px', fontWeight: 600, fontSize: '0.8rem' },
  rejected: { background: '#f8d7da', color: '#58151c', border: '1px solid #f1aeb5', borderRadius: '4px', padding: '2px 10px', fontWeight: 600, fontSize: '0.8rem' },
};

const OrganizerMerchandiseApprovals = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [expanded, setExpanded] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  const load = async (status) => {
    setError('');
    setMessage('');
    try {
      setLoading(true);
      const params = status ? `?status=${status}` : '';
      const res = await api.get(`/organizer/merch-approvals${params}`);
      setOrders(res.data.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(activeTab);
  }, [activeTab]);

  const patchOrder = (orderId, patch) => {
    setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, ...patch } : o)));
  };

  const approve = async (orderId) => {
    setError('');
    setMessage('');
    setActionLoading((prev) => ({ ...prev, [orderId]: 'approve' }));
    try {
      const res = await api.patch(`/organizer/merch-approvals/${orderId}/approve`);
      const updated = res.data.registration;
      if (activeTab === '' || activeTab === 'approved') {
        patchOrder(orderId, { paymentStatus: 'approved', qrData: updated?.qrData, ticketId: updated?.ticketId });
      } else {
        // Pending tab: order no longer pending, remove from view
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
      }
      setMessage('Order approved. QR ticket emailed to participant.');
    } catch (err) {
      setError(err.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: null }));
    }
  };

  const reject = async (orderId) => {
    setError('');
    setMessage('');
    const reason = rejectionReasons[orderId]?.trim();
    if (!reason) {
      setError('Please enter a rejection reason before rejecting.');
      return;
    }
    setActionLoading((prev) => ({ ...prev, [orderId]: 'reject' }));
    try {
      await api.patch(`/organizer/merch-approvals/${orderId}/reject`, { reason });
      if (activeTab === '' || activeTab === 'rejected') {
        patchOrder(orderId, { paymentStatus: 'rejected', rejectionReason: reason });
      } else {
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
      }
      setRejectionReasons((prev) => ({ ...prev, [orderId]: '' }));
      setMessage('Order rejected.');
    } catch (err) {
      setError(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [orderId]: null }));
    }
  };

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <PageContainer>
      <SectionHeader title="Merchandise Orders" />

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            style={{
              padding: '6px 18px',
              borderRadius: '20px',
              border: activeTab === tab.value ? '2px solid var(--primary, #0d6efd)' : '1px solid #ccc',
              background: activeTab === tab.value ? 'var(--primary, #0d6efd)' : '#fff',
              color: activeTab === tab.value ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: activeTab === tab.value ? 700 : 400,
              fontSize: '0.9rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && <p style={{ color: 'green', marginBottom: '0.75rem' }}>{message}</p>}
      {error   && <p style={{ color: 'red',   marginBottom: '0.75rem' }}>{error}</p>}

      {loading && <p>Loading orders…</p>}
      {!loading && orders.length === 0 && <p>No orders found for this filter.</p>}

      {orders.map((order) => {
        const status = order.paymentStatus || 'pending';
        const isPending  = status === 'pending';
        const isApproved = status === 'approved';
        const isRejected = status === 'rejected';

        return (
          <Card key={order._id} style={{ marginBottom: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <strong>{order.eventId?.name || order.event?.name || 'Event'}</strong>
                <span style={{ margin: '0 8px', color: '#666' }}>·</span>
                <span style={{ color: '#555' }}>{order.userId?.name || order.user?.name || 'Participant'}</span>
                <span style={{ margin: '0 6px', color: '#aaa' }}>
                  ({order.userId?.email || order.user?.email})
                </span>
              </div>
              <span style={statusStyle[status] || statusStyle.pending}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.4rem', fontSize: '0.85rem', color: '#555', flexWrap: 'wrap' }}>
              {order.totalAmount > 0 && <span><strong>Total:</strong> ₹{order.totalAmount}</span>}
              {order.createdAt && <span><strong>Placed:</strong> {new Date(order.createdAt).toLocaleString()}</span>}
              {order.ticketId && <span><strong>Ticket:</strong> <code style={{ fontSize: '0.8rem' }}>{order.ticketId}</code></span>}
            </div>

            {/* Ordered items */}
            {order.purchasedItems?.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong style={{ fontSize: '0.85rem', color: '#555' }}>Items:</strong>
                <ul style={{ margin: '4px 0 0 1rem', padding: 0, fontSize: '0.9rem' }}>
                  {order.purchasedItems.map((item, i) => (
                    <li key={i}>
                      {item.name || item.variantName} × {item.quantity}
                      {item.price > 0 && ` — ₹${item.price * item.quantity}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Payment Proof */}
            {order.paymentProofUrl ? (
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  className="ghost"
                  style={{ fontSize: '0.85rem', padding: '2px 8px' }}
                  onClick={() => toggleExpand(order._id)}
                >
                  {expanded[order._id] ? 'Hide' : 'View'} Payment Proof
                </button>
                {expanded[order._id] && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <img
                      src={order.paymentProofUrl}
                      alt="Payment proof"
                      style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.4rem' }}>No payment proof uploaded yet.</p>
            )}

            {/* QR for approved orders */}
            {isApproved && order.qrData && (
              <div style={{ marginTop: '0.75rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>QR Ticket:</strong>
                <div style={{ marginTop: '6px' }}>
                  <img
                    src={order.qrData}
                    alt="QR code"
                    style={{ width: '120px', height: '120px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                </div>
              </div>
            )}

            {/* Rejection reason display */}
            {isRejected && order.rejectionReason && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--error, #dc3545)' }}>
                <strong>Rejection reason:</strong> {order.rejectionReason}
              </p>
            )}

            {/* Actions — only for pending orders */}
            {isPending && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={() => approve(order._id)}
                    disabled={!!actionLoading[order._id]}
                    style={{ minWidth: '90px' }}
                  >
                    {actionLoading[order._id] === 'approve' ? 'Approving…' : 'Approve'}
                  </button>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <input
                      placeholder="Rejection reason (required to reject)"
                      value={rejectionReasons[order._id] || ''}
                      onChange={(e) =>
                        setRejectionReasons((prev) => ({ ...prev, [order._id]: e.target.value }))
                      }
                    />
                  </div>

                  <button
                    className="ghost"
                    style={{ color: 'var(--error, #dc3545)', minWidth: '80px' }}
                    onClick={() => reject(order._id)}
                    disabled={!!actionLoading[order._id]}
                  >
                    {actionLoading[order._id] === 'reject' ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </PageContainer>
  );
};

export default OrganizerMerchandiseApprovals;

import React, { useEffect, useState } from 'react';
import api from '../api/client.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import SectionHeader from '../components/SectionHeader.jsx';

const tabs = [
  { key: 'normal', label: 'Normal' },
  { key: 'merchandise', label: 'Merchandise' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled/Rejected' },
];

const MyEvents = () => {
  const [registrations, setRegistrations] = useState([]);
  const [tab, setTab] = useState('normal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setError('');
      setLoading(true);
      try {
        const res = await api.get(`/registrations/participant/events/${tab}`);
        setRegistrations(res.data.registrations || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load registrations');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tab]);

  const paymentStatusStyle = {
    pending:  { color: '#856404',  fontWeight: 600 },
    approved: { color: '#0a3622',  fontWeight: 600 },
    rejected: { color: '#58151c',  fontWeight: 600 },
  };

  const renderCard = (reg) => {
    const isMerch = reg.type === 'merchandise';
    const pStatus = reg.paymentStatus;

    return (
      <Card key={reg._id}>
        <SectionHeader
          title={reg.event?.name || 'Event'}
          subtitle={`Organizer: ${reg.event?.organizer?.name || '—'}`}
          actions={<span className="badge badge-blue">{reg.type}</span>}
        />
        {reg.event?.startDate && (
          <p className="muted">
            Schedule: {new Date(reg.event.startDate).toLocaleString()} —{' '}
            {reg.event?.endDate ? new Date(reg.event.endDate).toLocaleString() : ''}
          </p>
        )}

        {isMerch ? (
          <>
            <p>
              Payment Status:{' '}
              <span style={paymentStatusStyle[pStatus] || {}}>
                {pStatus ? pStatus.charAt(0).toUpperCase() + pStatus.slice(1) : '—'}
              </span>
            </p>

            {/* Items */}
            {reg.purchasedItems?.length > 0 && (
              <div style={{ fontSize: '0.88rem', marginTop: '0.25rem' }}>
                <strong>Items:</strong>
                <ul style={{ margin: '2px 0 0 1rem', padding: 0 }}>
                  {reg.purchasedItems.map((item, i) => (
                    <li key={i}>{item.name || item.variantName} × {item.quantity}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* QR for approved */}
            {pStatus === 'approved' && reg.qrData && (
              <div style={{ marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>QR Ticket:</p>
                <img
                  src={reg.qrData}
                  alt="QR"
                  style={{ width: '110px', height: '110px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '4px' }}
                />
                {reg.ticketId && (
                  <p style={{ fontSize: '0.78rem', color: '#555', marginTop: '4px' }}>
                    Ticket ID: <code>{reg.ticketId}</code>
                  </p>
                )}
              </div>
            )}

            {/* Rejection reason */}
            {pStatus === 'rejected' && reg.rejectionReason && (
              <p style={{ fontSize: '0.85rem', color: '#dc3545', marginTop: '0.25rem' }}>
                <strong>Reason:</strong> {reg.rejectionReason}
              </p>
            )}

            {/* Pending: nudge to upload proof */}
            {pStatus === 'pending' && (
              <p style={{ fontSize: '0.82rem', color: '#856404', marginTop: '0.25rem' }}>
                {reg.paymentProofUrl ? 'Payment proof submitted — awaiting organizer review.' : 'Please upload your payment proof on the event page.'}
              </p>
            )}
          </>
        ) : (
          <>
            <p>Status: {reg.status}</p>
            {reg.teamName && <p>Team: {reg.teamName}</p>}
            <p>
              Ticket:{' '}
              {reg.qrData ? (
                <span>
                  <img
                    src={reg.qrData}
                    alt="QR"
                    style={{ width: '90px', height: '90px', border: '1px solid #ccc', borderRadius: '4px', display: 'block', marginTop: '4px' }}
                  />
                  <code style={{ fontSize: '0.78rem' }}>{reg.ticketId}</code>
                </span>
              ) : (
                <code style={{ fontSize: '0.85rem' }}>{reg.ticketId || '—'}</code>
              )}
            </p>
          </>
        )}
      </Card>
    );
  };

  return (
    <PageContainer title="My Events">
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}

      <section className="stack">
        <div className="tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? 'tab active' : 'tab'}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {registrations.length === 0 && !loading && <p className="muted">No records in this category.</p>}
        <div className="card-grid">{registrations.map(renderCard)}</div>
      </section>
    </PageContainer>
  );
};

export default MyEvents;

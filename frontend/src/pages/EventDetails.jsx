import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import TeamSection from '../components/TeamSection.jsx';
import DiscussionForum from '../components/DiscussionForum.jsx';

const EventDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [message, setMessage] = useState('');
  const [items, setItems] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [formValues, setFormValues] = useState({});
  const [paymentProof, setPaymentProof] = useState('');
  const [myRegistration, setMyRegistration] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const participantType = user?.participantType || (user?.isIIIT ? 'iiit' : 'non-iiit');

  const updateValue = (label, value) => {
    setFormValues((prev) => ({ ...prev, [label]: value }));
  };

  const handleFile = (label, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setFormValues((prev) => ({ ...prev, [label]: e.target.result }));
    reader.readAsDataURL(file);
  };

  const handleProofFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPaymentProof(e.target.result);
    reader.readAsDataURL(file);
  };

  const register = async () => {
    if (event) {
      const allowed = event.eligibility || 'both';
      const ok = allowed === 'both' || allowed === participantType;
      if (!ok) {
        setMessage('You are not eligible for this event.');
        return;
      }
    }
    try {
      const responses = Object.entries(formValues).map(([label, value]) => ({ label, value }));
      const res = await api.post(`/registrations/${id}/register`, { responses, teamName });
      setMyRegistration(res.data.registration);
      setIsRegistered(true);
      setMessage('Registered successfully! Check your email for the ticket.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Registration failed');
    }
  };

  const purchase = async () => {
    if (event) {
      const allowed = event.eligibility || 'both';
      const ok = allowed === 'both' || allowed === participantType;
      if (!ok) {
        setMessage('You are not eligible for this event.');
        return;
      }
    }
    try {
      const responses = Object.entries(formValues).map(([label, value]) => ({ label, value }));
      const res = await api.post(`/registrations/${id}/purchase`, {
        items,
        responses,
        paymentProofUrl: paymentProof || null,
      });
      setMyRegistration(res.data.registration);
      setMessage(paymentProof
        ? 'Order placed with payment proof. Awaiting organizer approval.'
        : 'Order placed! Please upload your payment proof below so the organizer can verify and approve your order.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Purchase failed');
    }
  };

  const uploadProof = async () => {
    if (!paymentProof || !myRegistration) return;
    try {
      await api.patch(`/registrations/${myRegistration._id}/proof`, { paymentProofUrl: paymentProof });
      setMessage('Payment proof uploaded. Awaiting organizer approval.');
      setMyRegistration((prev) => ({ ...prev, paymentStatus: 'pending', paymentProofUrl: paymentProof }));
    } catch (err) {
      setMessage(err.response?.data?.message || 'Upload failed');
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/events/${id}`);
        setEvent(res.data.event);
        const defaults = {};
        (res.data.event.customFormSchema || []).forEach((f) => {
          defaults[f.label] = f.type === 'checkbox' ? false : '';
        });
        // Pre-select first option for each variant attribute group
        (res.data.event.variants || []).forEach((g) => {
          if (g.options?.length) defaults[g.name] = g.options[0];
        });
        setFormValues(defaults);
        if (res.data.event?.type === 'merchandise') {
          setItems((res.data.event.merchandiseVariants || []).map((v) => ({ variantName: v.name, quantity: 1 })));
        }
      } catch (err) {
        setMessage(err.response?.data?.message || 'Failed to load event');
      }
    };
    load();
  }, [id]);

  // Check if participant is already registered
  useEffect(() => {
    if (!user || user.role !== 'participant') return;
    const checkReg = async () => {
      try {
        const res = await api.get('/registrations/me/list');
        const found = (res.data.registrations || []).find(
          (r) => String(r.event?._id || r.event) === String(id)
        );
        if (found) {
          setMyRegistration(found);
          setIsRegistered(true);
        }
      } catch (_) {
        // ignore
      }
    };
    checkReg();
  }, [id, user]);

  if (!event) return <div className="layout">Loading...</div>;

  const isOrganizerOrAdmin = user?.role === 'organizer' || user?.role === 'admin';
  const eligibilityRule = event.eligibility || 'both';
  const isEligible = eligibilityRule === 'both' || eligibilityRule === participantType;

  return (
    <PageContainer title={event.name}>
      {/* Event summary card */}
      <Card>
        <SectionHeader
          title={event.name}
          subtitle={event.organizer?.name}
          actions={<span className="badge badge-blue">{event.type}</span>}
        />
        <p>{event.description}</p>
        <div className="tag-list">
          {event.eligibility && <span className="badge">Eligibility: {event.eligibility}</span>}
          {(event.tags || []).map((t) => <span key={t} className="badge">{t}</span>)}
        </div>
        {user?.role === 'participant' && !isEligible && (
          <p className="error">You are not eligible to register for this event.</p>
        )}
        {event.type === 'normal' && (
          <div className="grid-4" style={{ marginTop: '1rem' }}>
            <div className="stat"><p className="muted">Dates</p><p>{new Date(event.startDate).toLocaleString()} — {new Date(event.endDate).toLocaleString()}</p></div>
            <div className="stat"><p className="muted">Registration deadline</p><p>{new Date(event.registrationDeadline).toLocaleString()}</p></div>
            {event.remainingSlots !== null && <div className="stat"><p className="muted">Remaining slots</p><h4>{event.remainingSlots}</h4></div>}
          </div>
        )}
        {event.type === 'merchandise' && (
          <div className="grid-4" style={{ marginTop: '1rem' }}>
            <div className="stat"><p className="muted">Sale window</p><p>{event.saleStartDate ? new Date(event.saleStartDate).toLocaleString() : 'TBD'} — {event.saleEndDate ? new Date(event.saleEndDate).toLocaleString() : 'TBD'}</p></div>
            <div className="stat"><p className="muted">Stock</p><h4>{(event.merchandiseVariants || []).reduce((sum, v) => sum + (v.stock || 0), 0)}</h4></div>
          </div>
        )}
        <div className="tag-list" style={{ marginTop: '0.75rem' }}>
          {event.soldOut && <span className="badge badge-red">Sold out</span>}
          {event.deadlinePassed && <span className="badge badge-red">Deadline passed</span>}
          {event.saleNotStarted && <span className="badge badge-orange">Sale has not started</span>}
          {event.saleEnded && <span className="badge badge-red">Sale has ended</span>}
          {event.teamRegistration && (
            <span className="badge badge-blue">
              Team Registration Only{event.maxTeamSize ? ` (max ${event.maxTeamSize} per team)` : ''}
            </span>
          )}
        </div>
      </Card>

      {/* Custom registration form */}
      {!!(event.customFormSchema || []).length && !isRegistered && (
        <Card>
          <SectionHeader title="Registration Form" subtitle="Fields required to register" />
          {(event.customFormSchema || []).map((field) => (
            <div key={field.label} className="stack">
              <label>{field.label} {field.required && '*'}</label>
              {field.type === 'text' && (
                <input value={formValues[field.label] || ''} onChange={(e) => updateValue(field.label, e.target.value)} />
              )}
              {field.type === 'dropdown' && (
                <select value={formValues[field.label] || ''} onChange={(e) => updateValue(field.label, e.target.value)}>
                  <option value="">Select</option>
                  {(field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}
              {field.type === 'checkbox' && (
                <label className="checkbox">
                  <input type="checkbox" checked={!!formValues[field.label]} onChange={(e) => updateValue(field.label, e.target.checked)} />
                  Yes
                </label>
              )}
              {field.type === 'file' && (
                <input type="file" onChange={(e) => handleFile(field.label, e.target.files?.[0])} />
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Merchandise */}
      {event.type === 'merchandise' && (
        <Card>
          <SectionHeader title="Merchandise" />

          {/* Variant attribute selectors (Size, Color, etc.) */}
          {(event.variants || []).length > 0 && (
            <div className="stack" style={{ marginBottom: '0.75rem' }}>
              {(event.variants || []).map((g) => (
                <div key={g.name}>
                  <label>{g.name}</label>
                  <select
                    value={formValues[g.name] || ''}
                    onChange={(e) => updateValue(g.name, e.target.value)}
                  >
                    {(g.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Item rows with quantity */}
          {(event.merchandiseVariants || []).map((v, idx) => (
            <div key={v.name} className="variant-row">
              <div>{v.name}{v.price > 0 ? ` | ₹${v.price}` : ''} | Stock: {v.stock}</div>
              <input
                type="number" min={1} max={v.purchaseLimitPerUser || v.stock}
                value={items[idx]?.quantity || 1}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { variantName: v.name, quantity: Number(e.target.value) };
                  setItems(next);
                }}
              />
            </div>
          ))}

          {/* New order */}
          {user?.role === 'participant' && !myRegistration && event.canRegister && isEligible && (
            <div className="stack" style={{ marginTop: '0.75rem' }}>
              <label>Payment Proof <span className="muted">(you can also upload after placing the order)</span></label>
              <input type="file" accept="image/*" onChange={(e) => handleProofFile(e.target.files?.[0])} />
              {paymentProof && <img src={paymentProof} alt="proof preview" style={{ maxWidth: 200, borderRadius: 6, marginTop: 4 }} />}
              <div className="h-stack" style={{ justifyContent: 'flex-end' }}>
                <button onClick={purchase} disabled={event.soldOut}>
                  {event.soldOut ? 'Out of stock' : event.saleEnded ? 'Sale ended' : event.saleNotStarted ? 'Sale not started' : 'Place Order'}
                </button>
              </div>
            </div>
          )}

          {/* Existing order status */}
          {user?.role === 'participant' && myRegistration && (
            <div className="stack" style={{ marginTop: '0.75rem' }}>
              <div className="h-stack">
                <span className="muted">Order status:</span>
                <span className={`badge ${myRegistration.paymentStatus === 'approved' ? 'badge-green' : myRegistration.paymentStatus === 'rejected' ? 'badge-red' : 'badge-orange'}`}>
                  {myRegistration.paymentStatus === 'approved' ? 'Approved' : myRegistration.paymentStatus === 'rejected' ? 'Rejected' : 'Pending Approval'}
                </span>
              </div>
              {myRegistration.rejectionReason && <p className="error">Rejection reason: {myRegistration.rejectionReason}</p>}
              {myRegistration.paymentStatus === 'approved' && myRegistration.qrData && (
                <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                  <p className="muted" style={{ fontSize: '0.85rem' }}>Your ticket QR code — show this at entry</p>
                  <img src={myRegistration.qrData} alt="Ticket QR" style={{ width: 180, height: 180, borderRadius: 8 }} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Ticket ID: {myRegistration.ticketId}</p>
                </div>
              )}
              {['pending', 'rejected'].includes(myRegistration.paymentStatus) && (
                <>
                  <label style={{ marginTop: '0.5rem' }}>
                    {myRegistration.paymentStatus === 'rejected' ? 'Upload new payment proof' : myRegistration.paymentProofUrl ? 'Replace payment proof' : 'Upload payment proof'}
                  </label>
                  {myRegistration.paymentProofUrl && !paymentProof && (
                    <div>
                      <p className="muted" style={{ fontSize: '0.85rem' }}>Currently uploaded:</p>
                      <img src={myRegistration.paymentProofUrl} alt="Current proof" style={{ maxWidth: 200, borderRadius: 6 }} />
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleProofFile(e.target.files?.[0])} />
                  {paymentProof && <img src={paymentProof} alt="New proof preview" style={{ maxWidth: 200, borderRadius: 6 }} />}
                  <button onClick={uploadProof} disabled={!paymentProof}>Submit Payment Proof</button>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Normal event: solo registration OR team-based registration */}
      {event.type === 'normal' && user?.role === 'participant' && !isRegistered && event.canRegister && isEligible && (
        event.teamRegistration ? (
          /* Team-only event — solo card is not shown */
          <TeamSection
            eventId={id}
            maxTeamSize={event.maxTeamSize || null}
            onRegister={() => { setIsRegistered(true); setMessage('Team registered! Tickets sent to all members.'); }}
          />
        ) : (
          /* Solo-only event */
          <Card>
            <SectionHeader title="Register" />
            <div className="stack">
              <label>Group / Team Name (optional)</label>
              <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Leave blank for solo" />
            </div>
            <div className="h-stack" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button onClick={register}>Register</button>
            </div>
          </Card>
        )
      )}

      {event.type === 'normal' && user?.role === 'participant' && !isRegistered && !event.canRegister && (
        <Card>
          <p className="muted">Registration is closed for this event.</p>
        </Card>
      )}

      {event.type === 'normal' && user?.role === 'participant' && !isRegistered && event.canRegister && !isEligible && (
        <Card>
          <p className="error">You are not eligible to register for this event.</p>
        </Card>
      )}

      {event.type === 'normal' && isRegistered && (
        <Card>
          <p style={{ color: 'var(--success)' }}>✓ You are registered for this event.</p>
        </Card>
      )}

      {message && <p style={{ marginTop: '0.5rem' }}>{message}</p>}

      {/* Real-time discussion forum */}
      <DiscussionForum
        eventId={id}
        isRegistered={isRegistered}
        isOrganizerOrAdmin={isOrganizerOrAdmin}
      />
    </PageContainer>
  );
};

export default EventDetails;

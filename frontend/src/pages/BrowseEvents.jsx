import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import SectionHeader from '../components/SectionHeader.jsx';

const statusColor = (status) => {
  const map = { published: 'badge-green', ongoing: 'badge-blue', 'sale-live': 'badge-blue', closed: 'badge-red', completed: 'badge-neutral', draft: 'badge-orange', 'sale-ended': 'badge-red' };
  return map[status] || 'badge-neutral';
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : null;

const EventCard = ({ ev, trending }) => {
  const dateLabel = ev.type === 'normal'
    ? (ev.startDate ? fmtDate(ev.startDate) : null)
    : (ev.saleStartDate ? `Sale: ${fmtDate(ev.saleStartDate)}` : null);

  return (
    <Card>
      <div className="h-stack" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, lineHeight: 1.3 }}>{ev.name}</h3>
          <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>
            {ev.organizer?.name || '—'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', flexShrink: 0 }}>
          <span className="badge badge-blue">{ev.type}</span>
          <span className={`badge ${statusColor(ev.status)}`}>{ev.status}</span>
        </div>
      </div>

      <div className="tag-list" style={{ margin: '0.5rem 0 0' }}>
        {ev.eligibility && ev.eligibility !== 'both' && (
          <span className="badge badge-orange" style={{ fontSize: '0.72rem' }}>{ev.eligibility === 'iiit' ? 'IIIT only' : 'Non-IIIT only'}</span>
        )}
        {trending && <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>🔥 Trending</span>}
        {(ev.tags || []).slice(0, 3).map((t) => <span key={t} className="badge" style={{ fontSize: '0.72rem' }}>{t}</span>)}
      </div>

      <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {ev.description}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
        {dateLabel && <span>📅 {dateLabel}</span>}
        {ev.type === 'normal' && ev.registrationFee != null && (
          <span>₹{ev.registrationFee === 0 ? 'Free' : ev.registrationFee}</span>
        )}
        {ev.type === 'normal' && typeof ev.remainingSlots === 'number' && (
          <span>{ev.remainingSlots} slots left</span>
        )}
      </div>

      {typeof ev.recommendationScore === 'number' && ev.recommendationScore > 0 && (
        <p className="muted" style={{ fontSize: '0.78rem', marginBottom: '0.35rem' }}>
          ⭐ Match score: {ev.recommendationScore}
        </p>
      )}

      <div className="h-stack" style={{ justifyContent: 'flex-end' }}>
        <Link className="button" to={`/events/${ev._id}`}>View details</Link>
      </div>
    </Card>
  );
};

const BrowseEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usePreferences, setUsePreferences] = useState(true);
  const [followedOnly, setFollowedOnly] = useState(false);
  const debounceRef = useRef(null);

  const fetchEvents = async (overrides = {}) => {
    setLoading(true);
    setError('');
    const params = {
      q:              overrides.q              !== undefined ? overrides.q              : q,
      type:           overrides.type           !== undefined ? overrides.type           : type,
      eligibility:    overrides.eligibility    !== undefined ? overrides.eligibility    : eligibility,
      startDate:      overrides.startDate      !== undefined ? overrides.startDate      : startDate,
      endDate:        overrides.endDate        !== undefined ? overrides.endDate        : endDate,
      usePreferences: (overrides.usePreferences !== undefined ? overrides.usePreferences : usePreferences) && user?.role === 'participant',
      followedOnly:   overrides.followedOnly   !== undefined ? overrides.followedOnly   : followedOnly,
    };
    // remove falsy values to keep URL clean (but keep explicit false for booleans that matter)
    Object.keys(params).forEach((k) => { if (params[k] === '' || params[k] === null || params[k] === undefined) delete params[k]; });
    try {
      const res = await api.get('/events', { params });
      setEvents(res.data.events || []);
      setTrendingEvents(res.data.trending || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced live search only — other filters wait for Apply button
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQ(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchEvents({ q: val }), 350);
  };

  const handleTypeChange = (e) => setType(e.target.value);
  const handleEligibilityChange = (e) => setEligibility(e.target.value);
  const handleStartDateChange = (e) => setStartDate(e.target.value);
  const handleEndDateChange = (e) => setEndDate(e.target.value);
  const handlePrefsChange = (e) => setUsePreferences(e.target.checked);
  const handleFollowedChange = (e) => setFollowedOnly(e.target.checked);

  const applyFilters = () => fetchEvents();

  const clearFilters = () => {
    setQ(''); setType(''); setEligibility(''); setStartDate(''); setEndDate('');
    setUsePreferences(true); setFollowedOnly(false);
    fetchEvents({ q: '', type: '', eligibility: '', startDate: '', endDate: '', usePreferences: true, followedOnly: false });
  };

  return (
    <PageContainer title="Browse Events">
      {/* Filters */}
      <Card>
        <SectionHeader
          title="Search &amp; Filters"
          actions={
            <div className="h-stack" style={{ gap: '0.5rem' }}>
              <button onClick={applyFilters} disabled={loading}>{loading ? 'Loading…' : 'Apply Filters'}</button>
              <button className="ghost" onClick={clearFilters}>Clear Filters</button>
            </div>
          }
        />
        <div className="filters" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <input
            placeholder="Search events or organizers…"
            value={q}
            onChange={handleSearchChange}
            style={{ minWidth: 220 }}
          />
          <select value={type} onChange={handleTypeChange}>
            <option value="">All Types</option>
            <option value="normal">Normal</option>
            <option value="merchandise">Merchandise</option>
          </select>
          <select value={eligibility} onChange={handleEligibilityChange}>
            <option value="">All Eligibility</option>
            <option value="both">IIIT + Non-IIIT</option>
            <option value="iiit">IIIT only</option>
            <option value="non-iiit">Non-IIIT only</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>From</label>
            <input type="date" value={startDate} onChange={handleStartDateChange} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>To</label>
            <input type="date" value={endDate} onChange={handleEndDateChange} />
          </div>
          {user?.role === 'participant' && (
            <label className="checkbox">
              <input type="checkbox" checked={usePreferences} onChange={handlePrefsChange} />
              Order by my interests
            </label>
          )}
          <label className="checkbox">
            <input type="checkbox" checked={followedOnly} onChange={handleFollowedChange} />
            Followed clubs only
          </label>
        </div>
        {user?.role === 'participant' && (
          <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>
            💡 Recommendations are ranked using your interests and followed organizers. Adjust on the Profile page.
          </p>
        )}
      </Card>

      {error && <p className="error">{error}</p>}

      {/* Trending section — always shown when data is available */}
      {trendingEvents.length > 0 && (
        <section className="stack">
          <SectionHeader title="🔥 Trending Now" subtitle="Top 5 events by registrations in the past 24 hours" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '1rem',
            }}
          >
            {trendingEvents.map((ev) => (
              <EventCard key={ev._id} ev={ev} trending />
            ))}
          </div>
        </section>
      )}

      {/* All events matching current filters */}
      <section className="stack">
        <SectionHeader title="All Events" subtitle={loading ? 'Loading…' : `${events.length} event${events.length !== 1 ? 's' : ''} found`} />
        {!loading && events.length === 0 && (
          <p className="muted">No events match your filters.</p>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {events.map((ev) => {
            const isTrending = trendingEvents.some((t) => String(t._id) === String(ev._id));
            return <EventCard key={ev._id} ev={ev} trending={isTrending} />;
          })}
        </div>
      </section>
    </PageContainer>
  );
};

export default BrowseEvents;

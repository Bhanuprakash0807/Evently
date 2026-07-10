import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import SectionHeader from '../components/SectionHeader.jsx';

const OrganizerEvents = () => {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('ongoing');
  const [globalMessage, setGlobalMessage] = useState('');
  const [feedback, setFeedback] = useState({}); // per-event action messages
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setGlobalMessage('');
    setFeedback({});
    setLoading(true);
    const res = await api.get('/events/me/mine', { params: { includeStats: true } });
    setEvents(res.data.events || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const statusMatches = (ev, bucket) => {
    const buckets = {
      ongoing: ['ongoing', 'sale-live', 'published'],
      completed: ['completed', 'sale-ended', 'closed'],
    };
    if (bucket === 'all') return true;
    return (buckets[bucket] || []).includes(ev.status);
  };

  const { filtered, counts } = useMemo(() => {
    const nextCounts = { ongoing: 0, completed: 0, all: events.length };
    const filteredEvents = [];
    events.forEach((ev) => {
      if (statusMatches(ev, 'ongoing')) nextCounts.ongoing += 1;
      if (statusMatches(ev, 'completed')) nextCounts.completed += 1;
      if (statusMatches(ev, filter)) filteredEvents.push(ev);
    });
    return { filtered: filteredEvents, counts: nextCounts };
  }, [events, filter]);

  const act = async (id, action) => {
    setGlobalMessage('');
    setFeedback((prev) => ({ ...prev, [id]: '' }));
    try {
      await api.post(`/events/${id}/${action}`);
      setFeedback((prev) => ({ ...prev, [id]: `${action} ok` }));
      load();
    } catch (err) {
      const msg = err.response?.data?.message || `${action} failed`;
      setFeedback((prev) => ({ ...prev, [id]: msg }));
    }
  };

  return (
    <PageContainer title="My Events">
      {loading && <p>Loading...</p>}
      <div className="h-stack" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
        {[
          { key: 'ongoing', label: 'Ongoing' },
          { key: 'completed', label: 'Completed' },
          { key: 'all', label: 'All' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={filter === tab.key ? '' : 'ghost'}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label} ({counts[tab.key] ?? 0})
          </button>
        ))}
      </div>
      <div className="card-grid">
        {filtered.map((ev) => (
          <Card key={ev._id}>
            <SectionHeader
              title={ev.name}
              subtitle={`Status: ${ev.status}`}
              actions={<span className="badge badge-blue">{ev.type}</span>}
            />
            <p className="muted" style={{ marginBottom: '0.35rem' }}>
              {ev.startDate ? new Date(ev.startDate).toLocaleString() : 'TBD'}
              {ev.endDate ? ` — ${new Date(ev.endDate).toLocaleString()}` : ''}
            </p>
            <p className="muted">Registrations: {ev.stats?.registrations ?? '—'} • Revenue: {ev.stats?.revenue ?? 0}</p>
            <div className="h-stack" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => act(ev._id, 'publish')} disabled={ev.status !== 'draft'}>
                Publish
              </button>
              <button
                onClick={() => act(ev._id, 'close')}
                disabled={!['published', 'ongoing', 'sale-live'].includes(ev.status)}
              >
                Close
              </button>
              <button
                onClick={() => act(ev._id, 'complete')}
                disabled={!['ongoing', 'published', 'sale-live', 'sale-ended'].includes(ev.status)}
              >
                Mark Completed
              </button>
              <a className="button ghost" href={`/organizer/events/${ev._id}/edit`} style={{ opacity: ev.status === 'draft' ? 1 : 0.5, pointerEvents: ev.status === 'draft' ? 'auto' : 'none' }}>
                Edit
              </a>
              <a className="button" href={`/organizer/events/${ev._id}`}>
                View Detail
              </a>
            </div>
            {feedback[ev._id] && <p className="muted">{feedback[ev._id]}</p>}
          </Card>
        ))}
      </div>
      {!loading && filtered.length === 0 && <p className="muted">No events in this view yet.</p>}
      {globalMessage && <p>{globalMessage}</p>}
    </PageContainer>
  );
};

export default OrganizerEvents;

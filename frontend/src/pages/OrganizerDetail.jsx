import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client.js';

const OrganizerDetail = () => {
  const { id } = useParams();
  const [organizer, setOrganizer] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setError('');
      try {
        const res = await api.get(`/events/organizers/${id}`);
        setOrganizer(res.data.organizer);
        setUpcoming(res.data.upcoming || []);
        setPast(res.data.past || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load organizer');
      }
    };
    load();
  }, [id]);

  if (!organizer) return <div className="layout">{error || 'Loading...'}</div>;

  const renderEvent = (ev) => (
    <div key={ev._id} className="card">
      <h4>{ev.name}</h4>
      <p>{ev.description}</p>
      <p>
        Type: {ev.type} | Start: {new Date(ev.startDate).toLocaleString()}
      </p>
      <Link to={`/events/${ev._id}`}>View</Link>
    </div>
  );

  return (
    <div className="layout">
      <h2>{organizer.name}</h2>
      <p>Category: {organizer.organizerProfile?.category}</p>
      <p>Description: {organizer.organizerProfile?.description}</p>
      <p>Contact: {organizer.organizerProfile?.contactEmail || organizer.email}</p>
      {error && <p className="error">{error}</p>}

      <section className="stack">
        <h3>Upcoming Events</h3>
        {upcoming.length === 0 && <p className="muted">No upcoming events.</p>}
        {upcoming.map(renderEvent)}
      </section>

      <section className="stack">
        <h3>Past Events</h3>
        {past.length === 0 && <p className="muted">No past events.</p>}
        {past.map(renderEvent)}
      </section>
    </div>
  );
};

export default OrganizerDetail;

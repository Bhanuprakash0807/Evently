import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import SectionHeader from '../components/SectionHeader.jsx';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [orgEvents, setOrgEvents] = useState([]);
  const [orgStats, setOrgStats] = useState(null);
  const [adminStats, setAdminStats] = useState({ total: 0, active: 0, disabled: 0, pendingRequests: 0 });
  const [resetReason, setResetReason] = useState('');
  const [resetHistory, setResetHistory] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (user?.role !== 'organizer') return;
      const [eventsRes, statsRes] = await Promise.all([
        api.get('/events/me/mine', { params: { includeStats: true } }),
        api.get('/organizer/dashboard-stats'),
      ]);
      setOrgEvents(eventsRes.data.events || []);
      setOrgStats(statsRes.data || null);
    };
    load();
  }, [user]);

  useEffect(() => {
    const loadStats = async () => {
      if (user?.role !== 'admin') return;
      try {
        const res = await api.get('/admin/dashboard-stats');
        setAdminStats(res.data);
      } catch (err) {
        console.error('Failed to load admin stats', err);
      }
    };
    loadStats();
  }, [user]);

  useEffect(() => {
    const loadResetHistory = async () => {
      if (user?.role !== 'organizer') return;
      try {
        const res = await api.get('/organizer/password-reset-history');
        setResetHistory(res.data.requests || []);
      } catch (err) {
        console.error('Failed to load reset history', err);
      }
    };
    loadResetHistory();
  }, [user]);

  const submitResetRequest = async (e) => {
    e.preventDefault();
    if (!resetReason.trim()) return;
    await api.post('/organizer/request-password-reset', { reason: resetReason });
    setResetReason('');
    const res = await api.get('/organizer/password-reset-history');
    setResetHistory(res.data.requests || []);
  };

  return (
    <PageContainer
      title="Dashboard"
      actions={<button className="ghost" onClick={logout}>Logout</button>}
    >
      <Card>
        <SectionHeader title="Your Profile" subtitle={`Signed in as ${user?.name}`} />
        <p>Email: {user?.email}</p>
        <p>Role: {user?.role}</p>
        {user?.isIIIT && <p>IIIT verified</p>}
      </Card>

      {user?.role === 'admin' && (
        <>
          <Card>
            <SectionHeader title="Organizer Stats" />
            <div className="grid-4">
              <div className="stat"><p className="muted">Total Organizers</p><h3>{adminStats.total}</h3></div>
              <div className="stat"><p className="muted">Active</p><h3>{adminStats.active}</h3></div>
              <div className="stat"><p className="muted">Disabled</p><h3>{adminStats.disabled}</h3></div>
              <div className="stat"><p className="muted">Pending Password Requests</p><h3>{adminStats.pendingRequests}</h3></div>
            </div>
          </Card>
          <Card>
            <SectionHeader title="Quick Actions" />
            <div className="h-stack">
              <a className="button" href="/admin/manage">Manage Organizers</a>
              <a className="button" href="/admin/passwords">Password Reset Requests</a>
            </div>
          </Card>
        </>
      )}

      {user?.role === 'organizer' && (
        <Card>
          <SectionHeader title="Organizer Tools" subtitle="Quick view of your events and performance" />
          <div className="grid-4">
            <div className="stat"><p className="muted">Total Events</p><h3>{orgStats?.totalEventsCreated ?? '—'}</h3></div>
            <div className="stat"><p className="muted">Active Events</p><h3>{orgStats?.activeEvents ?? '—'}</h3></div>
            <div className="stat"><p className="muted">Registrations</p><h3>{orgStats?.totalRegistrations ?? '—'}</h3></div>
            <div className="stat"><p className="muted">Total Revenue (₹)</p><h3>{orgStats?.totalRevenue ?? '—'}</h3></div>
            <div className="stat"><p className="muted">Normal Event Revenue (₹)</p><h3>{orgStats?.normalRevenue ?? '—'}</h3></div>
            <div className="stat"><p className="muted">Merch Revenue (₹)</p><h3>{orgStats?.merchandiseRevenue ?? '—'}</h3></div>
          </div>
          <div className="carousel" style={{ marginTop: '1rem' }}>
            {orgEvents.map((ev) => (
              <Card key={ev._id}>
                <SectionHeader
                  title={ev.name}
                  subtitle={`Status: ${ev.status}`}
                  actions={<span className="badge badge-blue">{ev.type}</span>}
                />
                <p>Registrations: {ev.stats?.registrations ?? 0}</p>
                <p>Revenue: {ev.stats?.revenue ?? 0}</p>
                <a className="button" href={`/organizer/events/${ev._id}`}>
                  Manage
                </a>
              </Card>
            ))}
            {!orgEvents.length && <p className="muted">No events yet. Create one to get started.</p>}
          </div>
          <div className="stack" style={{ marginTop: '1rem' }}>
            <h4>Password Reset Requests</h4>
            <form className="h-stack" onSubmit={submitResetRequest}>
              <input
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                placeholder="Reason for reset"
                required
              />
              <button type="submit">Request Reset</button>
            </form>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Comment</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {!resetHistory.length && (
                    <tr>
                      <td colSpan="4">No requests yet.</td>
                    </tr>
                  )}
                  {resetHistory.map((r) => (
                    <tr key={r.id}>
                      <td>{r.reason}</td>
                      <td>{r.status}</td>
                      <td>{r.adminComment || '-'}</td>
                      <td>{new Date(r.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {user?.role === 'participant' && (
        <Card>
          <SectionHeader title="Participant Actions" subtitle="View your registrations and event updates" />
          <p>
            Visit Browse Events to register or purchase merchandise; see My Events for tickets and
            history.
          </p>
        </Card>
      )}
    </PageContainer>
  );
};

export default Dashboard;

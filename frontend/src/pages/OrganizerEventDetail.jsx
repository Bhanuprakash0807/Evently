import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import DiscussionForum from '../components/DiscussionForum.jsx';

const OrganizerEventDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tab, setTab] = useState('participants');
  const [error, setError] = useState('');

  // Filter state
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [attendance, setAttendance] = useState('');
  const [regType, setRegType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // debounce ref for live search
  const debounceRef = useRef(null);

  const fetchParticipants = useCallback(async (overrides = {}) => {
    const params = {
      search:        overrides.search        !== undefined ? overrides.search        : search,
      paymentStatus: overrides.paymentStatus !== undefined ? overrides.paymentStatus : paymentStatus,
      attendance:    overrides.attendance    !== undefined ? overrides.attendance    : attendance,
      type:          overrides.regType       !== undefined ? overrides.regType       : regType,
      fromDate:      overrides.fromDate      !== undefined ? overrides.fromDate      : fromDate,
      toDate:        overrides.toDate        !== undefined ? overrides.toDate        : toDate,
    };
    // Strip empty strings so they aren't sent as query params
    Object.keys(params).forEach((k) => { if (params[k] === '') delete params[k]; });
    try {
      const res = await api.get(`/organizer/events/${id}/participants`, { params });
      setParticipants(res.data.participants || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load participants');
    }
  }, [id, search, paymentStatus, attendance, regType, fromDate, toDate]);

  const load = async () => {
    setError('');
    try {
      const adminRes = await api.get(`/events/${id}/organizer`);
      setData(adminRes.data);
      await fetchParticipants();
      try {
        const teamsRes = await api.get(`/teams/event/${id}/all`);
        setTeams(teamsRes.data.teams || []);
      } catch (_) {
        setTeams([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load event');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Live search with 350ms debounce
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchParticipants({ search: val });
    }, 350);
  };

  const applyFilters = () => fetchParticipants();

  const clearFilters = () => {
    setSearch('');
    setPaymentStatus('');
    setAttendance('');
    setRegType('');
    setFromDate('');
    setToDate('');
    fetchParticipants({ search: '', paymentStatus: '', attendance: '', regType: '', fromDate: '', toDate: '' });
  };

  const exportCsv = async () => {
    try {
      const res = await api.get(`/organizer/events/${id}/participants/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `event-${id}-registrations.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed');
    }
  };

  if (!data) return <div className="layout">{error || 'Loading...'}</div>;

  const { event, stats } = data;

  const participantColumns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'registrationDate',
      label: 'Registration Date',
      render: (row) => new Date(row.registrationDate).toLocaleString(),
    },
    {
      key: 'paymentStatus',
      label: 'Payment Status',
      render: (row) => {
        const colors = { paid: 'badge-green', approved: 'badge-green', pending: 'badge-orange', rejected: 'badge-red' };
        return <span className={`badge ${colors[row.paymentStatus] || 'badge-neutral'}`}>{row.paymentStatus || '—'}</span>;
      },
    },
    {
      key: 'attendanceStatus',
      label: 'Attendance',
      render: (row) => <span className={`badge ${row.attendanceStatus === 'attended' ? 'badge-blue' : 'badge-neutral'}`}>{row.attendanceStatus || '—'}</span>,
    },
    { key: 'ticketId', label: 'Ticket ID' },
    { key: 'type', label: 'Type', render: (row) => <span className="badge">{row.type}</span> },
    { key: 'teamName', label: 'Team', render: (row) => row.teamName || '—' },
  ];

  const teamColumns = [
    { key: 'teamName', label: 'Team Name' },
    { key: 'status', label: 'Status', render: (r) => <span className={`badge ${r.status === 'registered' ? 'badge-green' : r.status === 'complete' ? 'badge-blue' : 'badge-neutral'}`}>{r.status}</span> },
    { key: 'leader', label: 'Leader', render: (r) => r.leader?.firstName ? `${r.leader.firstName} ${r.leader.lastName || ''}` : r.leader?.email || '—' },
    { key: 'members', label: 'Members', render: (r) => (r.members || []).length },
    { key: 'inviteCode', label: 'Invite Code' },
  ];

  return (
    <PageContainer
      title={event.name}
      actions={<button className="ghost" onClick={exportCsv}>Export CSV</button>}
    >
      <Card>
        <SectionHeader
          title="Event Overview"
          subtitle={`${event.type} • ${event.status}`}
          actions={<span className="badge">{event.eligibility || 'Open'}</span>}
        />
        <p className="muted" style={{ marginBottom: '0.75rem' }}>
          {event.startDate ? new Date(event.startDate).toLocaleString() : 'TBD'}
          {event.endDate ? ` — ${new Date(event.endDate).toLocaleString()}` : ''}
        </p>
        <div className="grid-4">
          <div className="stat"><p className="muted">Registrations</p><h3>{stats.registrations}</h3></div>
          <div className="stat"><p className="muted">Completed</p><h3>{stats.completed}</h3></div>
          <div className="stat"><p className="muted">Cancelled</p><h3>{stats.cancelled}</h3></div>
          <div className="stat"><p className="muted">Attendance</p><h3>{stats.attendance}</h3></div>
          <div className="stat"><p className="muted">Revenue</p><h3>{stats.revenue}</h3></div>
          <div className="stat"><p className="muted">Normal</p><h3>{stats.normal}</h3></div>
          <div className="stat"><p className="muted">Merchandise</p><h3>{stats.merchandise}</h3></div>
        </div>
      </Card>

      {/* Tab bar */}
      <div className="h-stack" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
        <button className={tab === 'participants' ? '' : 'ghost'} onClick={() => setTab('participants')}>Participants</button>
        {teams.length > 0 && <button className={tab === 'teams' ? '' : 'ghost'} onClick={() => setTab('teams')}>Teams ({teams.length})</button>}
        <button className={tab === 'merch' ? '' : 'ghost'} onClick={() => setTab('merch')}>
          Merch Approvals <Link to="/organizer/merch-approvals" style={{ fontSize: '0.75rem', marginLeft: 4 }}>(open full page)</Link>
        </button>
        <button className={tab === 'forum' ? '' : 'ghost'} onClick={() => setTab('forum')}>Forum</button>
      </div>

      {tab === 'participants' && (
        <Card>
          <SectionHeader title="Participants" subtitle={`${participants.length} result${participants.length !== 1 ? 's' : ''}`} />
          <div className="filters" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <input
              placeholder="Search name / email / ticket"
              value={search}
              onChange={handleSearchChange}
              style={{ minWidth: 200 }}
            />
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option value="">All Payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={attendance} onChange={(e) => setAttendance(e.target.value)}>
              <option value="">All Attendance</option>
              <option value="true">Attended</option>
              <option value="false">Absent</option>
            </select>
            <select value={regType} onChange={(e) => setRegType(e.target.value)}>
              <option value="">All Types</option>
              <option value="normal">Normal</option>
              <option value="merchandise">Merchandise</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <button onClick={applyFilters}>Apply</button>
            <button className="ghost" onClick={clearFilters}>Clear</button>
          </div>
          <DataTable columns={participantColumns} data={participants} emptyMessage="No participants match the current filters" />
        </Card>
      )}
      {tab === 'teams' && (
        <Card>
          <SectionHeader title="Registered Teams" subtitle={`${teams.length} teams`} />
          <DataTable columns={teamColumns} data={teams} emptyMessage="No teams yet" />
        </Card>
      )}
      {tab === 'merch' && (
        <Card>
          <SectionHeader title="Merchandise Approvals" subtitle="Manage pending payment proofs" />
          <p className="muted">Open the full approvals page to review, approve, or reject orders:</p>
          <Link to="/organizer/merch-approvals"><button>Go to Merch Approvals</button></Link>
        </Card>
      )}
      {tab === 'forum' && (
        <DiscussionForum
          eventId={id}
          isRegistered={false}
          isOrganizerOrAdmin={true}
        />
      )}
      {error && <p className="error">{error}</p>}
    </PageContainer>
  );
};

export default OrganizerEventDetail;

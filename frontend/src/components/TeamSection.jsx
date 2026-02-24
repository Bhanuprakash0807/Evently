import React, { useEffect, useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * TeamSection — shown on EventDetails for normal events.
 * Participants can create a team, join via code, or view their current team.
 */
const TeamSection = ({ eventId, onRegister, maxTeamSize = null }) => {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Create form state
  const [teamName, setTeamName] = useState('');
  const [teamSizeLimit, setTeamSizeLimit] = useState(maxTeamSize || 2);

  // Join form state
  const [inviteCode, setInviteCode] = useState('');
  const [view, setView] = useState('loading'); // 'loading' | 'none' | 'create' | 'join' | 'team'

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/teams/event/${eventId}/my`);
      if (res.data.team) {
        setTeam(res.data.team);
        setView('team');
      } else {
        setView('none');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load team info');
      setView('none');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'participant') load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const createTeam = async () => {
    setError('');
    setMessage('');
    try {
      const res = await api.post(`/teams/event/${eventId}/create`, { teamName, teamSizeLimit });
      setTeam(res.data.team);
      setView('team');
      setMessage('Team created! Share your invite code with teammates.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create team');
    }
  };

  const joinTeam = async () => {
    setError('');
    setMessage('');
    try {
      const res = await api.post('/teams/join', { inviteCode });
      setTeam(res.data.team);
      setView('team');
      setMessage('Joined team successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join team');
    }
  };

  const registerTeam = async () => {
    setError('');
    setMessage('');
    try {
      const res = await api.post(`/teams/${team._id}/register`);
      setTeam(res.data.team);
      setMessage('Team registered! Tickets sent to all members.');
      if (onRegister) onRegister(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Team registration failed');
    }
  };

  if (user?.role !== 'participant') return null;
  if (loading) return null;

  const joinedCount = team?.members?.filter((m) => m.status === 'joined').length || 0;
  const isLeader = team && String(team.leader?._id || team.leader) === String(user?.id);

  return (
    <div className="card stack" style={{ marginTop: '1rem' }}>
      <h4>Team Registration</h4>

      {view === 'none' && (
        <div className="h-stack" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <button onClick={() => setView('create')}>Create Team</button>
          <button className="ghost" onClick={() => setView('join')}>Join via Invite Code</button>
        </div>
      )}

      {view === 'create' && (
        <div className="stack">
          <label>Team Name</label>
          <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="My Awesome Team" />
          {maxTeamSize ? (
            <p className="muted">Team size fixed by the organizer: <strong>{maxTeamSize}</strong></p>
          ) : (
            <>
              <label>Team Size</label>
              <input
                type="number"
                min={2}
                max={20}
                value={teamSizeLimit}
                onChange={(e) => setTeamSizeLimit(Number(e.target.value))}
              />
            </>
          )}
          <div className="h-stack">
            <button onClick={createTeam} disabled={!teamName.trim()}>Create Team</button>
            <button className="ghost" onClick={() => setView('none')}>Cancel</button>
          </div>
        </div>
      )}

      {view === 'join' && (
        <div className="stack">
          <label>Invite Code</label>
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="e.g. A1B2C"
          />
          <div className="h-stack">
            <button onClick={joinTeam} disabled={!inviteCode.trim()}>Join Team</button>
            <button className="ghost" onClick={() => setView('none')}>Cancel</button>
          </div>
        </div>
      )}

      {view === 'team' && team && (
        <div className="stack">
          <div className="h-stack" style={{ justifyContent: 'space-between' }}>
            <div>
              <strong>{team.teamName}</strong>
              <span className={`badge ${team.status === 'complete' || team.status === 'registered' ? 'badge-green' : 'badge-orange'}`} style={{ marginLeft: '0.5rem' }}>
                {team.status}
              </span>
            </div>
            <span className="muted">{joinedCount} / {team.teamSizeLimit} members</span>
          </div>

          {isLeader && (
            <div className="stack" style={{ background: 'var(--surface)', padding: '0.75rem', borderRadius: '6px' }}>
              <p className="muted" style={{ fontSize: '0.85rem' }}>Share this invite code with your teammates:</p>
              <code style={{ fontSize: '1.2rem', letterSpacing: '0.2em', fontWeight: 'bold' }}>{team.inviteCode}</code>
            </div>
          )}

          <div>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Members:</p>
            <div className="stack">
              {(team.members || []).map((m) => (
                <div key={String(m.user?._id || m.user)} className="h-stack" style={{ fontSize: '0.9rem' }}>
                  <span>{m.user?.name || 'Unknown'}</span>
                  <span className="muted">({m.user?.email})</span>
                  {String(team.leader?._id || team.leader) === String(m.user?._id || m.user) && (
                    <span className="badge badge-blue">Leader</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isLeader && team.status === 'complete' && (
            <button onClick={registerTeam}>Register Team</button>
          )}
          {team.status === 'forming' && (
            <p className="muted">Waiting for {team.teamSizeLimit - joinedCount} more member(s) to join.</p>
          )}
          {team.status === 'registered' && (
            <p style={{ color: 'var(--success)' }}>Team is registered! Check your email for tickets.</p>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {message && <p style={{ color: 'var(--success)' }}>{message}</p>}
    </div>
  );
};

export default TeamSection;

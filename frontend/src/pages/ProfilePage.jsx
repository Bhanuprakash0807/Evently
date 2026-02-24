import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { INTEREST_OPTIONS } from '../constants/preferences.js';
import PasswordField from '../components/PasswordField.jsx';

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const [organizers, setOrganizers] = useState([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    collegeOrgName: '',
    contactNumber: '',
  });
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState('');
  const [selectedOrganizers, setSelectedOrganizers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [hydrated, setHydrated] = useState(false);

  const customInterests = useMemo(
    () =>
      selectedInterests.filter(
        (i) => !INTEREST_OPTIONS.some((opt) => opt.toLowerCase() === String(i).toLowerCase())
      ),
    [selectedInterests]
  );

  const interestOptions = useMemo(
    () => [...INTEREST_OPTIONS, ...customInterests],
    [customInterests]
  );

  useEffect(() => {
    if (!hydrated && user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        collegeOrgName: user.collegeOrgName || '',
        contactNumber: user.contactNumber || '',
      });
      setSelectedInterests(user.interests || []);
      setSelectedOrganizers((user.followedOrganizers || []).map((id) => String(id)));
      setHydrated(true);
    }
  }, [user, hydrated]);

  useEffect(() => {
    const loadOrganizers = async () => {
      try {
        const res = await api.get('/events/organizers');
        setOrganizers(res.data.organizers || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load organizers');
      }
    };
    loadOrganizers();
  }, []);
  if (!user) return null;
  if (user.role === 'organizer') {
    return <OrganizerProfile />;
  }
  if (user.role !== 'participant') {
    return (
      <div className="layout">
        <div className="card">
          <p>Profile editing for this role is limited.</p>
        </div>
      </div>
    );
  }

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleInterest = (interest) => {
    const cleaned = String(interest || '').trim();
    if (!cleaned) return;
    const norm = cleaned.toLowerCase();
    setSelectedInterests((prev) => {
      const has = prev.some((i) => String(i).trim().toLowerCase() === norm);
      return has
        ? prev.filter((i) => String(i).trim().toLowerCase() !== norm)
        : [...prev, cleaned];
    });
  };

  const addCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (!trimmed) return;
    setSelectedInterests((prev) => {
      const exists = prev.some((i) => i.toLowerCase() === trimmed.toLowerCase());
      return exists ? prev : [...prev, trimmed];
    });
    setCustomInterest('');
  };

  const toggleOrganizer = (id) => {
    setSelectedOrganizers((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );
  };

  const save = async () => {
    setMessage('');
    setError('');
    try {
      const payload = {
        ...form,
        interests: selectedInterests,
        followedOrganizers: selectedOrganizers,
      };
      const res = await api.patch('/profile/participant', payload);
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setMessage('Preferences updated');
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    }
  };

  const changePassword = async () => {
    setMessage('');
    setError('');
    if (!pwd.newPassword || pwd.newPassword !== pwd.confirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      await api.post('/profile/change-password', {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      setMessage('Password updated');
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Password change failed');
    }
  };

  return (
    <div className="layout">
      <h2>Profile & Preferences</h2>
      <div className="card stack">
        <p className="muted">Keep your contact info and personalization settings up to date.</p>
        <label>Email (read-only)</label>
        <input value={user.email} disabled />
        <label>Participant Type (read-only)</label>
        <input value={user.participantType} disabled />
        <label>First Name</label>
        <input name="firstName" value={form.firstName} onChange={onChange} />
        <label>Last Name</label>
        <input name="lastName" value={form.lastName} onChange={onChange} />
        <label>College/Organization</label>
        <input name="collegeOrgName" value={form.collegeOrgName} onChange={onChange} />
        <label>Contact Number</label>
        <input name="contactNumber" value={form.contactNumber} onChange={onChange} />

        <div className="preference-card">
          <h4>Interests</h4>
          <p className="muted small-text">
            Choose multiple interests to tailor recommendations. Tap again to deselect.
          </p>
          <div className="interest-grid">
            {interestOptions.map((option) => {
              const isActive = selectedInterests.some(
                (i) => i.toLowerCase() === option.toLowerCase()
              );
              return (
                <button
                  key={option}
                  type="button"
                  className={`interest-pill ${isActive ? 'is-active' : ''}`}
                  onClick={() => toggleInterest(option)}
                  aria-pressed={isActive}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <div className="custom-row">
            <input
              placeholder="Add custom interest"
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
            />
            <button type="button" className="ghost" onClick={addCustomInterest}>
              Add
            </button>
          </div>

          <div className="pref-divider" />

          <h4>Follow Clubs & Organizers</h4>
          <p className="muted small-text">Follow to prioritize their events in your feed.</p>
          {!organizers.length && <p className="muted">No organizers available yet.</p>}
          <div className="organizer-grid">
            {organizers.map((org) => {
              const id = String(org._id);
              const isSelected = selectedOrganizers.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`organizer-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleOrganizer(id)}
                  aria-pressed={isSelected}
                >
                  <span className="organizer-name">{org.name}</span>
                  <span className="organizer-meta">
                    {org.organizerProfile?.category || 'Organizer'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-actions">
          <button onClick={save}>Update Preferences</button>
        </div>
        {message && <p>{message}</p>}
        {error && <p className="error">{error}</p>}

        <h4>Security</h4>
        <p className="muted">Update your password.</p>
        <PasswordField
          label="Current Password"
          name="currentPassword"
          value={pwd.currentPassword}
          onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
          required
        />
        <PasswordField
          label="New Password"
          name="newPassword"
          value={pwd.newPassword}
          onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
          required
        />
        <PasswordField
          label="Confirm New Password"
          name="confirm"
          value={pwd.confirm}
          onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
          required
        />
        <div className="form-actions">
          <button onClick={changePassword}>Change Password</button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

function OrganizerProfile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    category: user?.organizerProfile?.category || '',
    description: user?.organizerProfile?.description || '',
    contactEmail: user?.organizerProfile?.contactEmail || user?.email || '',
    contactNumber: user?.organizerProfile?.contactNumber || '',
    webhookUrl: user?.organizerProfile?.webhookUrl || '',
    discordWebhookUrl: user?.organizerProfile?.discordWebhookUrl || '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async () => {
    setMessage('');
    setError('');
    try {
      const res = await api.patch('/profile/organizer', form);
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setMessage('Organizer profile updated');
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    }
  };

  return (
    <div className="layout">
      <h2>Organizer Profile</h2>
      <div className="card stack">
        <label>Email (login, read-only)</label>
        <input value={user.email} disabled />
        <label>Name</label>
        <input name="name" value={form.name} onChange={onChange} />
        <label>Category</label>
        <input name="category" value={form.category} onChange={onChange} />
        <label>Description</label>
        <textarea name="description" value={form.description} onChange={onChange} />
        <label>Contact Email</label>
        <input name="contactEmail" value={form.contactEmail} onChange={onChange} />
        <label>Contact Number</label>
        <input name="contactNumber" value={form.contactNumber} onChange={onChange} />
        <label>Discord Webhook (for new event alerts)</label>
        <input name="webhookUrl" value={form.webhookUrl} onChange={onChange} />
        <label>Discord Webhook (publish notifications)</label>
        <input name="discordWebhookUrl" value={form.discordWebhookUrl} onChange={onChange} />
        <div className="form-actions">
          <button onClick={save}>Save</button>
        </div>
        {message && <p>{message}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

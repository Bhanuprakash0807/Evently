import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { INTEREST_OPTIONS } from '../constants/preferences.js';

const Onboarding = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [organizers, setOrganizers] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState('');
  const [selectedOrganizers, setSelectedOrganizers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const customInterests = selectedInterests.filter(
    (i) => !INTEREST_OPTIONS.some((opt) => opt.toLowerCase() === String(i).toLowerCase())
  );

  const interestOptions = useMemo(
    () => [...INTEREST_OPTIONS, ...customInterests],
    [customInterests]
  );

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hydrated && user) {
      setSelectedInterests(user.interests || []);
      setSelectedOrganizers((user.followedOrganizers || []).map((id) => String(id)));
      setHydrated(true);
    }
  }, [user, hydrated]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/events/organizers');
        setOrganizers(res.data.organizers || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load organizers');
      }
    };
    load();
  }, []);

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
    setSaving(true);
    setError('');
    try {
      const payload = {
        interests: selectedInterests,
        followedOrganizers: selectedOrganizers,
      };
      const res = await api.patch('/profile/participant', payload);
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('onboardingSeen', 'true');
      const redirect = location.state?.from?.pathname || '/';
      navigate(redirect);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save preferences');
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    localStorage.setItem('onboardingSeen', 'true');
    const redirect = location.state?.from?.pathname || '/';
    navigate(redirect);
  };

  if (!user) return null;

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h2>Welcome!</h2>
          <p className="muted">Select your interests so we can personalize your feed.</p>
        </div>

        <div className="onboarding-section">
          <h3 className="section-title">Select Your Interests</h3>
          <p className="muted small-text">
            Choose areas that interest you to personalize your experience. You can always change these later.
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
              placeholder="Add a custom interest"
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
            />
            <button type="button" onClick={addCustomInterest} className="ghost">
              Add
            </button>
          </div>
        </div>

        <div className="onboarding-section">
          <h3 className="section-title">Follow Clubs & Organizers</h3>
          <p className="muted small-text">Follow clubs to get their events prioritized in your feed.</p>
          {!organizers.length && <p className="muted">No organizers listed yet.</p>}
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

        {error && <p className="error">{error}</p>}
        <div className="onboarding-actions">
          <button onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Update Preferences'}
          </button>
          <button className="ghost" onClick={skip} disabled={saving}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

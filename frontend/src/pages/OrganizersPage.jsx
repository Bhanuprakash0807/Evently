import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const OrganizersPage = () => {
  const { user, setUser } = useAuth();
  const [organizers, setOrganizers] = useState([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    const res = await api.get('/events/organizers');
    setOrganizers(res.data.organizers || []);
  };

  useEffect(() => {
    load();
  }, []);

  const follow = async (id, action) => {
    setMessage('');
    try {
      const res =
        action === 'follow'
          ? await api.post(`/profile/follow/${id}`)
          : await api.post(`/profile/unfollow/${id}`);
      const updated = { ...user, followedOrganizers: res.data.followedOrganizers };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      setMessage('Updated');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Update failed');
    }
  };

  const isFollowing = (id) => user?.followedOrganizers?.some((o) => o === id || o?._id === id);

  return (
    <div className="layout">
      <h2>Clubs / Organizers</h2>
      {organizers.map((org) => (
        <div key={org._id} className="card">
          <h4>{org.name}</h4>
          <p>{org.organizerProfile?.description}</p>
          <p>Category: {org.organizerProfile?.category}</p>
          <p>Contact: {org.organizerProfile?.contactEmail}</p>
          <Link to={`/organizers/${org._id}`}>View details</Link>
          {user?.role === 'participant' && (
            <button onClick={() => follow(org._id, isFollowing(org._id) ? 'unfollow' : 'follow')}>
              {isFollowing(org._id) ? 'Unfollow' : 'Follow'}
            </button>
          )}
        </div>
      ))}
      {message && <p>{message}</p>}
    </div>
  );
};

export default OrganizersPage;

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Navbar = () => {
  const { user, logout } = useAuth();
  if (!user) return null;

  const participantNav = (
    <>
      <Link to="/">Dashboard</Link>
      <Link to="/browse">Browse Events</Link>
      <Link to="/organizers">Clubs/Organizers</Link>
      <Link to="/my-events">My Events</Link>
      <Link to="/profile">Profile</Link>
    </>
  );

  const organizerNav = (
    <>
      <Link to="/">Dashboard</Link>
      <Link to="/organizer/create">Create Event</Link>
      <Link to="/organizer/events">Ongoing Events</Link>
      <Link to="/organizer/merch-approvals">Merch Approvals</Link>
      <Link to="/profile">Profile</Link>
    </>
  );

  const adminLinks = (
    <>
      <Link to="/">Dashboard</Link>
      <Link to="/admin/manage">Manage Clubs/Organizers</Link>
      <Link to="/admin/passwords">Password Resets</Link>
    </>
  );

  return (
    <nav className="navbar">
      <div className="nav-left">
        <span className="brand">Event Platform</span>
        {user.role === 'participant' && participantNav}
        {user.role === 'organizer' && organizerNav}
        {user.role === 'admin' && adminLinks}
      </div>
      <div className="nav-right">
        <span>{user.email}</span>
        <button onClick={logout}>Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';
import BrowseEvents from './pages/BrowseEvents.jsx';
import EventDetails from './pages/EventDetails.jsx';
import MyEvents from './pages/MyEvents.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import OrganizersPage from './pages/OrganizersPage.jsx';
import OrganizerCreateEvent from './pages/OrganizerCreateEvent.jsx';
import OrganizerEvents from './pages/OrganizerEvents.jsx';
import AdminManageOrganizers from './pages/AdminManageOrganizers.jsx';
import Onboarding from './pages/Onboarding.jsx';
import OrganizerDetail from './pages/OrganizerDetail.jsx';
import OrganizerEventDetail from './pages/OrganizerEventDetail.jsx';
import AdminPasswordResets from './pages/AdminPasswordResets.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import OrganizerMerchandiseApprovals from './pages/OrganizerMerchandiseApprovals.jsx';
import OrganizerForgotPassword from './pages/OrganizerForgotPassword.jsx';

const App = () => {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/organizer/forgot-password" element={<OrganizerForgotPassword />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute roles={['participant', 'organizer', 'admin']}>
              <ChangePassword />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute roles={['participant']}>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute roles={['participant', 'organizer', 'admin']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/browse"
          element={
            <ProtectedRoute roles={['participant', 'organizer', 'admin']}>
              <BrowseEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id"
          element={
            <ProtectedRoute roles={['participant', 'organizer', 'admin']}>
              <EventDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-events"
          element={
            <ProtectedRoute roles={['participant']}>
              <MyEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute roles={['participant', 'organizer', 'admin']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizers"
          element={
            <ProtectedRoute roles={['participant', 'organizer', 'admin']}>
              <OrganizersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizers/:id"
          element={
            <ProtectedRoute roles={['participant', 'organizer', 'admin']}>
              <OrganizerDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/create"
          element={
            <ProtectedRoute roles={['organizer']}>
              <OrganizerCreateEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events"
          element={
            <ProtectedRoute roles={['organizer']}>
              <OrganizerEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events/:id/edit"
          element={
            <ProtectedRoute roles={['organizer']}>
              <OrganizerCreateEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events/:id"
          element={
            <ProtectedRoute roles={['organizer']}>
              <OrganizerEventDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/manage"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminManageOrganizers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/passwords"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminPasswordResets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/merch-approvals"
          element={
            <ProtectedRoute roles={['organizer']}>
              <OrganizerMerchandiseApprovals />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;

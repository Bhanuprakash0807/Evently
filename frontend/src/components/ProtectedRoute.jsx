import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ProtectedRoute = ({ roles, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  const mustChange = user.mustChangePassword;
  const isChangePage = location.pathname === '/change-password';
  if (mustChange && !isChangePage) {
    return <Navigate to="/change-password" replace />;
  }

  const onboardingSeen = localStorage.getItem('onboardingSeen') === 'true';
  const needsOnboarding =
    user.role === 'participant' && !user.interests?.length && !onboardingSeen;
  const isOnboardingPage = location.pathname === '/onboarding';
  if (needsOnboarding && !isOnboardingPage) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;

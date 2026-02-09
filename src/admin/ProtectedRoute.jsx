import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen bg-custom-dark text-white flex items-center justify-center">Checking access...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles.length && !roles.includes(role)) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;

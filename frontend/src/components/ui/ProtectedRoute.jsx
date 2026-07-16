/**
 * ETU Diagnostic Laboratory — Protected Route Component
 *
 * Wraps routes requiring authentication and optional role-based access.
 * Shows a loading state while verifying auth, redirects to login if unauthenticated,
 * and renders AccessDeniedPage if the user lacks the required role.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import AccessDeniedPage from '../../pages/AccessDeniedPage.jsx';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loading">
        <LoadingSpinner size="xl" variant="primary" />
        <span className="page-loading__text">Loading secure workspace…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <AccessDeniedPage />;
  }

  return children;
}

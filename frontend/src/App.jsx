/**
 * ETU Diagnostic Laboratory — Main Application Router
 *
 * Configures routes, layouts, and access control permissions.
 */

import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ui/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';

// Pages
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const ReceptionPage = lazy(() => import('./pages/ReceptionPage.jsx'));
const CollectionPage = lazy(() => import('./pages/CollectionPage.jsx'));
const CounsellingPage = lazy(() => import('./pages/CounsellingPage.jsx'));
const ReportManagementPage = lazy(() => import('./pages/ReportManagementPage.jsx'));
const ExtraRequestsPage = lazy(() => import('./pages/ExtraRequestsPage.jsx'));
const ReportApprovalsPage = lazy(() => import('./pages/ReportApprovalsPage.jsx'));
const UsersPage = lazy(() => import('./pages/UsersPage.jsx'));
const StockPage = lazy(() => import('./pages/StockPage.jsx'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage.jsx'));
const SampleTypesPage = lazy(() => import('./pages/SampleTypesPage.jsx'));
const PatientManagementPage = lazy(() => import('./pages/PatientManagementPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));

/**
 * Handle landing page routing redirect based on the user's role.
 */
function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'Reception':
      return <Navigate to="/reception" replace />;
    case 'Sample Collector':
      return <Navigate to="/collection" replace />;
    case 'Approver':
      return <Navigate to="/report-approvals" replace />;
    case 'Admin':
    default:
      return <Navigate to="/admin" replace />;
  }
}

export default function App() {
  return (
    <Suspense fallback={<div className="page"><p className="intro">Loading workspace…</p></div>}>
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Layout Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />

        {/* Admin Dashboard */}
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={['Admin']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Reception Desk */}
        <Route
          path="reception"
          element={
            <ProtectedRoute roles={['Reception']}>
              <ReceptionPage />
            </ProtectedRoute>
          }
        />

        {/* Sample Collection */}
        <Route
          path="collection"
          element={
            <ProtectedRoute roles={['Sample Collector']}>
              <CollectionPage />
            </ProtectedRoute>
          }
        />
        <Route path="report-management" element={<ProtectedRoute roles={['Sample Collector']}><ReportManagementPage /></ProtectedRoute>} />
        <Route path="counselling" element={<ProtectedRoute roles={['Admin', 'Reception', 'Sample Collector']}><CounsellingPage /></ProtectedRoute>} />

        {/* Report Approvals */}
        <Route
          path="report-approvals"
          element={
            <ProtectedRoute roles={['Admin', 'Approver']}>
              <ReportApprovalsPage />
            </ProtectedRoute>
          }
        />

        {/* Extra Requests */}
        <Route
          path="extra-requests"
          element={
            <ProtectedRoute roles={['Admin', 'Approver']}>
              <ExtraRequestsPage />
            </ProtectedRoute>
          }
        />

        {/* Stock Management */}
        <Route
          path="stock"
          element={
            <ProtectedRoute roles={['Admin', 'Reception']}>
              <StockPage />
            </ProtectedRoute>
          }
        />

        {/* Stock Categories */}
        <Route
          path="categories"
          element={
            <ProtectedRoute roles={['Admin']}>
              <CategoriesPage />
            </ProtectedRoute>
          }
        />

        {/* Sample Types */}
        <Route
          path="sample-types"
          element={
            <ProtectedRoute roles={['Admin']}>
              <SampleTypesPage />
            </ProtectedRoute>
          }
        />

        {/* Central Admin Patient Registry */}
        <Route
          path="patient-management"
          element={
            <ProtectedRoute roles={['Admin']}>
              <PatientManagementPage />
            </ProtectedRoute>
          }
        />

        {/* User Management */}
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['Admin']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route path="settings" element={<ProtectedRoute roles={['Admin']}><SettingsPage /></ProtectedRoute>} />
      </Route>

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

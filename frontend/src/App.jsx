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
const InvestigationPage = lazy(() => import('./pages/InvestigationPage.jsx'));
const CounsellingPage = lazy(() => import('./pages/CounsellingPage.jsx'));
const ReportManagementPage = lazy(() => import('./pages/ReportManagementPage.jsx'));
const ExtraRequestsPage = lazy(() => import('./pages/ExtraRequestsPage.jsx'));
const ReportApprovalsPage = lazy(() => import('./pages/ReportApprovalsPage.jsx'));
const UsersPage = lazy(() => import('./pages/UsersPage.jsx'));
const StockPage = lazy(() => import('./pages/StockPage.jsx'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage.jsx'));
const PatientManagementPage = lazy(() => import('./pages/PatientManagementPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const LaboratoryTestsPage = lazy(() => import('./pages/LaboratoryTestsPage.jsx'));
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage.jsx'));
const AboutUsPage = lazy(() => import('./pages/AboutUsPage.jsx'));
const PublicReportPage = lazy(() => import('./pages/PublicReportPage.jsx'));
const PathologyPage = lazy(() => import('./pages/PathologyPage.jsx'));
const RadiologyPage = lazy(() => import('./pages/RadiologyPage.jsx'));
const AdminPathologyPage = lazy(() => import('./pages/AdminPathologyPage.jsx'));
const AdminRadiologyPage = lazy(() => import('./pages/AdminRadiologyPage.jsx'));

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
    case 'Pathologist':
      return <Navigate to="/pathology" replace />;
    case 'Radiologist':
      return <Navigate to="/radiology" replace />;
    case 'Sub Admin':
    case 'Admin':
    default:
      return <Navigate to="/admin" replace />;
  }
}

export default function App() {
  return (
    <Suspense fallback={
      <div className="lims-global-loading-overlay" role="dialog" aria-modal="true" aria-label="Loading Workspace">
        <div className="lims-loading-card">
          <div className="lims-loading-spinner-wrap">
            <div className="lims-loading-spinner-ring" />
            <div className="lims-loading-spinner-ring-inner" />
            <div className="lims-loading-spinner-core">🧪</div>
          </div>
          <h2 className="lims-loading-title">Processing...</h2>
          <p className="lims-loading-subtitle">Please wait while the system processes your request...</p>
        </div>
      </div>
    }>
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/report/public/:token" element={<PublicReportPage />} />
      <Route path="/public-report/:token" element={<PublicReportPage />} />

      {/* Protected Layout Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />

        {/* Admin / Sub Admin Dashboard */}
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={['Admin', 'Sub Admin']}>
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
        <Route path="investigation" element={<ProtectedRoute roles={['Admin', 'Sample Collector']}><InvestigationPage /></ProtectedRoute>} />
        <Route path="report-management" element={<ProtectedRoute roles={['Sample Collector']}><ReportManagementPage /></ProtectedRoute>} />
        <Route path="counselling" element={<ProtectedRoute roles={['Admin', 'Reception', 'Sample Collector']}><CounsellingPage /></ProtectedRoute>} />

        {/* Report Approvals */}
        <Route
          path="report-approvals"
          element={
            <ProtectedRoute roles={['Admin', 'Approver', 'Sub Admin']}>
              <ReportApprovalsPage />
            </ProtectedRoute>
          }
        />

        {/* Extra Requests */}
        <Route
          path="extra-requests"
          element={
            <ProtectedRoute roles={['Admin', 'Approver', 'Sub Admin', 'Reception', 'Sample Collector']}>
              <ExtraRequestsPage />
            </ProtectedRoute>
          }
        />

        {/* Stock Management */}
        <Route
          path="stock"
          element={
            <ProtectedRoute roles={['Admin', 'Reception', 'Sample Collector', 'Sub Admin']}>
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
        <Route path="laboratory-tests" element={<ProtectedRoute roles={['Admin', 'Sub Admin']}><LaboratoryTestsPage /></ProtectedRoute>} />
        <Route path="admin-reports" element={<ProtectedRoute roles={['Admin', 'Sub Admin']}><AdminReportsPage /></ProtectedRoute>} />

        {/* Pathology & Radiology Modules */}
        <Route path="pathology" element={<ProtectedRoute roles={['Admin', 'Pathologist']}><PathologyPage /></ProtectedRoute>} />
        <Route path="radiology" element={<ProtectedRoute roles={['Admin', 'Radiologist']}><RadiologyPage /></ProtectedRoute>} />
        <Route path="admin-pathology" element={<ProtectedRoute roles={['Admin', 'Sub Admin']}><AdminPathologyPage /></ProtectedRoute>} />
        <Route path="admin-radiology" element={<ProtectedRoute roles={['Admin', 'Sub Admin']}><AdminRadiologyPage /></ProtectedRoute>} />

        {/* About Us */}
        <Route
          path="about"
          element={
            <ProtectedRoute roles={['Admin', 'Sub Admin', 'Reception', 'Sample Collector', 'Approver', 'Pathologist', 'Radiologist']}>
              <AboutUsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

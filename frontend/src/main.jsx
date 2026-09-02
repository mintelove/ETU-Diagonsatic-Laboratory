import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { PreferencesProvider } from './context/PreferencesContext.jsx';
import { RealtimeProvider } from './context/RealtimeContext.jsx';

import { LoadingProvider } from './context/LoadingContext.jsx';

// Styling Architecture
import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/components/a4Report.css';
import './styles/components/internalMedicine.css';

import './styles/pages/login.css';
import './styles/pages/users.css';
import './styles/pages/categories.css';
import './styles/pages/dashboard.css';
import './styles/pages/sampleTypes.css';
import './styles/pages/reception.css';
import './styles/pages/laboratory-tests.css';
import './styles/pages/collection-queue.css';
import './styles/pages/investigation.css';
import './styles/pages/equipment.css';
import './styles/pages/parameter-editing.css';
import './styles/pages/settings.css';
import './styles/pages/navigation.css';
import './styles/pages/phase17.css';
import './styles/theme.css';
import './styles.css'; // Legacy/existing app page styles
import './styles/responsive.css'; // Responsive layout additions
import './styles/components/clinicalResultEntry.css'; // Clinical specialist pages
import './styles/components/reportPreview.css'; // Report Preview isolated explicit color system (LOADED LAST FOR MAXIMUM SPECIFICITY)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
          <PreferencesProvider>
            <LoadingProvider>
              <App />
            </LoadingProvider>
          </PreferencesProvider>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

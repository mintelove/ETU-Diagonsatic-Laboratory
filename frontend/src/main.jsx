import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { PreferencesProvider } from './context/PreferencesContext.jsx';
import { RealtimeProvider } from './context/RealtimeContext.jsx';

// Styling Architecture
import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages/login.css';
import './styles/pages/users.css';
import './styles/pages/categories.css';
import './styles/pages/dashboard.css';
import './styles/pages/sampleTypes.css';
import './styles/pages/reception.css';
import './styles/pages/laboratory-tests.css';
import './styles/pages/collection-queue.css';
import './styles/pages/equipment.css';
import './styles/pages/parameter-editing.css';
import './styles/pages/settings.css';
import './styles/pages/navigation.css';
import './styles/pages/phase17.css';
import './styles/theme.css';
import './styles.css'; // Legacy/existing app page styles
import './styles/responsive.css'; // Responsive layout additions

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
          <PreferencesProvider><App /></PreferencesProvider>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

/**
 * ETU Diagnostic Laboratory — Full-Screen Photorealistic Equipment Login Page
 *
 * Features:
 * - Full-screen (100vw x 100vh) photorealistic laboratory equipment slideshow
 *   showcasing 8 real ETU laboratory machines & tools cycling every 3 seconds.
 * - Bottom-left text overlay (left: 6%, bottom: 8%) that dynamically transitions
 *   with equipment-specific diagnostic titles and supporting subtitles.
 * - Floating glassmorphic login panel positioned on the right side (right: 6%).
 * - Prominent laboratory logo matching printable report reference size (height 60px).
 * - 100% preserved authentication logic and viewport fit.
 */

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { login as apiLogin } from '../services/authService.js';
import { useForm } from '../hooks/useForm.js';
import { usePreferences } from '../context/PreferencesContext.jsx';
import { api } from '../api/client.js';
import labLogo from '../assets/logo.jpg';

import slideMicroscope from '../assets/slide-microscope.png';
import slideBloodTubes from '../assets/slide-blood-tubes.png';
import slideAnalyzer from '../assets/slide-analyzer.png';
import slideCentrifuge from '../assets/slide-centrifuge.png';
import slideWorkspace from '../assets/slide-workspace.png';
import slideKlite from '../assets/slide-klite.png';
import slideFinecare from '../assets/slide-finecare.png';
import slideCoagulation from '../assets/slide-coagulation.png';

const copy = {
  en: {
    welcome: 'Welcome Back',
    subtitle: 'Sign in to Laboratory Information Management System (LIMS)',
    username: 'Username',
    password: 'Password',
    usernameHint: 'Enter your username',
    passwordHint: 'Enter your password',
    show: 'Show password',
    hide: 'Hide password',
    remember: 'Remember my login on this device',
    signIn: 'Sign In Securely',
    verifying: 'Verifying credentials…',
    requiredUser: 'Username is required',
    shortUser: 'Username must be at least 3 characters',
    requiredPassword: 'Password is required',
    invalid: 'Invalid username or password.',
    version: 'Version',
    rights: 'All Rights Reserved',
    theme: 'Theme',
    language: 'Language',
  },
  am: {
    welcome: 'እንኳን በደህና መጡ',
    subtitle: 'ወደ የላቦራቶሪ መረጃ አስተዳደር ሥርዓት ይግቡ',
    username: 'የተጠቃሚ ስም',
    password: 'የይለፍ ቃል',
    usernameHint: 'የተጠቃሚ ስምዎን ያስገቡ',
    passwordHint: 'የይለፍ ቃልዎን ያስገቡ',
    show: 'የይለፍ ቃል አሳይ',
    hide: 'የይለፍ ቃል ደብቅ',
    remember: 'በዚህ መሣሪያ ላይ አስታውሰኝ',
    signIn: 'በደህንነት ግባ',
    verifying: 'በማረጋገጥ ላይ…',
    requiredUser: 'የተጠቃሚ ስም ያስፈልጋል',
    shortUser: 'የተጠቃሚ ስም ቢያንስ 3 ፊደላት መሆን አለበት',
    requiredPassword: 'የይለፍ ቃል ያስፈልጋል',
    invalid: 'የተጠቃሚ ስም ወይም የይለፍ ቃል ልክ አይደለም።',
    version: 'ስሪት',
    rights: 'መብቱ በሙሉ የተጠበቀ ነው',
    theme: 'ገጽታ',
    language: 'ቋንቋ',
  },
};

// 8 ETU Equipment Scenes with custom equipment titles and subtitles
const LAB_SCENES = [
  {
    id: 'bs120',
    name: 'Mindray BS-120 Chemistry Analyzer',
    title: 'Accurate Clinical Chemistry',
    subtitle: 'Modern diagnostic technology supporting precise biochemistry and metabolic testing.',
    image: slideAnalyzer,
    accent: '#00d2ff',
    buttonGradient: 'linear-gradient(135deg, #0b6bcb 0%, #00d2ff 100%)',
    glow: 'rgba(0, 210, 255, 0.45)',
    cardBorder: 'rgba(0, 210, 255, 0.35)',
  },
  {
    id: 'bc3000',
    name: 'BC-3000 Plus Hematology Analyzer',
    title: 'Advanced Hematology Diagnostics',
    subtitle: 'Automated blood cell counts and 3-part differential analysis for reliable diagnostic results.',
    image: slideWorkspace,
    accent: '#ff4b2b',
    buttonGradient: 'linear-gradient(135deg, #d32f2f 0%, #ff4b2b 100%)',
    glow: 'rgba(255, 75, 43, 0.45)',
    cardBorder: 'rgba(255, 75, 43, 0.35)',
  },
  {
    id: 'klite8',
    name: 'K-Lite 8 Electrolyte Analyzer',
    title: 'Precision Electrolyte Testing',
    subtitle: 'Ion-selective analysis for rapid Na+, K+, Cl-, and Ca++ diagnostic monitoring.',
    image: slideKlite,
    accent: '#00e676',
    buttonGradient: 'linear-gradient(135deg, #00897b 0%, #00e676 100%)',
    glow: 'rgba(0, 230, 118, 0.45)',
    cardBorder: 'rgba(0, 230, 118, 0.35)',
  },
  {
    id: 'finecare',
    name: 'Finecare HbA1c Immunoassay Reader',
    title: 'Advanced Immunodiagnostics',
    subtitle: 'Automated glycated hemoglobin and cardiac bio-marker immunoassay testing.',
    image: slideFinecare,
    accent: '#38ef7d',
    buttonGradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    glow: 'rgba(56, 239, 125, 0.45)',
    cardBorder: 'rgba(56, 239, 125, 0.35)',
  },
  {
    id: 'coagulation',
    name: 'Semi Automatic 2-Part Coagulation Analyzer',
    title: 'Precision Coagulation Assay',
    subtitle: 'Hemostasis testing for accurate PT, APTT, INR, and clotting time evaluation.',
    image: slideCoagulation,
    accent: '#4facfe',
    buttonGradient: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
    glow: 'rgba(79, 172, 254, 0.45)',
    cardBorder: 'rgba(79, 172, 254, 0.35)',
  },
  {
    id: 'microscope',
    name: 'Clinical Binocular Microscope',
    title: 'Precision in Every Observation',
    subtitle: 'Advanced laboratory microscopy for high-accuracy cellular and cytological analysis.',
    image: slideMicroscope,
    accent: '#00d2ff',
    buttonGradient: 'linear-gradient(135deg, #0b6bcb 0%, #00d2ff 100%)',
    glow: 'rgba(0, 210, 255, 0.45)',
    cardBorder: 'rgba(0, 210, 255, 0.35)',
  },
  {
    id: 'centrifuge',
    name: 'High-Speed Laboratory Centrifuge',
    title: 'Precision Sample Processing',
    subtitle: 'Reliable plasma and serum separation for high-quality laboratory diagnostic testing.',
    image: slideCentrifuge,
    accent: '#ff4b2b',
    buttonGradient: 'linear-gradient(135deg, #d32f2f 0%, #ff4b2b 100%)',
    glow: 'rgba(255, 75, 43, 0.45)',
    cardBorder: 'rgba(255, 75, 43, 0.35)',
  },
  {
    id: 'bloodtubes',
    name: 'Vacuum Blood Collection Tubes',
    title: 'Every Sample Matters',
    subtitle: 'Careful specimen handling and color-coded tube processing ensure sample integrity.',
    image: slideBloodTubes,
    accent: '#00e676',
    buttonGradient: 'linear-gradient(135deg, #00897b 0%, #00e676 100%)',
    glow: 'rgba(0, 230, 118, 0.45)',
    cardBorder: 'rgba(0, 230, 118, 0.35)',
  },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const { preferences, updatePreferences, t } = usePreferences();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [now, setNow] = useState(new Date());
  const [sceneIndex, setSceneIndex] = useState(0);

  const text = copy[preferences.language] || copy.en;

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Automatic Background Scene Rotation every 3 seconds
  useEffect(() => {
    const sceneTimer = setInterval(() => {
      setSceneIndex((prev) => (prev + 1) % LAB_SCENES.length);
    }, 3000);
    return () => clearInterval(sceneTimer);
  }, []);

  // Form Validation
  const { values, errors, touched, handleChange, handleBlur, validateAll } = useForm(
    {
      username: '',
      password: '',
      rememberMe: true,
    },
    (formValues) => {
      const errs = {};
      if (!formValues.username) {
        errs.username = text.requiredUser;
      } else if (formValues.username.trim().length < 3) {
        errs.username = text.shortUser;
      }
      if (!formValues.password) {
        errs.password = text.requiredPassword;
      }
      return errs;
    }
  );

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  // Handle Form Submit
  async function handleSubmit(event) {
    event.preventDefault();
    setApiError('');

    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      const sessionData = await apiLogin(values.username, values.password);
      try {
        const stored = await api('/preferences', {
          token: sessionData.token,
          method: 'PATCH',
          body: JSON.stringify({ theme: preferences.theme, language: preferences.language }),
        });
        sessionData.user.preferences = { ...sessionData.user.preferences, ...stored.preferences };
      } catch {
        /* Preference sync fallback */
      }
      login(sessionData, values.rememberMe);
    } catch (err) {
      setApiError(err.message || text.invalid);
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentScene = LAB_SCENES[sceneIndex];

  return (
    <div
      className="login-fullscreen-page lab-theme-login"
      style={{
        '--scene-accent': currentScene.accent,
        '--scene-btn-bg': currentScene.buttonGradient,
        '--scene-glow': currentScene.glow,
        '--scene-card-border': currentScene.cardBorder,
      }}
    >
      {/* ── 100VW x 100VH FULL-SCREEN LABORATORY SLIDESHOW BACKGROUND ───── */}
      <div className="lab-fullscreen-slideshow">
        {LAB_SCENES.map((scene, idx) => (
          <div
            key={scene.id}
            className={`lab-fullscreen-slide ${idx === sceneIndex ? 'slide-active' : ''}`}
          >
            <div className="lab-fullscreen-overlay" />
            <img
              src={scene.image}
              alt={scene.name}
              className="lab-fullscreen-photo"
            />
          </div>
        ))}
        <div className="lab-particle-grid" />
      </div>

      {/* ── BOTTOM-LEFT DYNAMIC TEXT OVERLAY (SYNCHRONIZED WITH ACTIVE SLIDE) ── */}
      <div className="lab-bottom-left-overlay" key={currentScene.id}>
        <div className="lab-bottom-tag">ETU Diagnostic Laboratory</div>
        <h2 className="lab-bottom-title">{currentScene.title}</h2>
        <p className="lab-bottom-subtitle">{currentScene.subtitle}</p>
        <div className="lab-bottom-scene-pill">
          <span className="lab-bottom-dot" />
          <span>{currentScene.name}</span>
        </div>

        {/* Scene Indicator Dots */}
        <div className="lab-dots-indicator">
          {LAB_SCENES.map((sc, idx) => (
            <span
              key={sc.id}
              className={`lab-dot ${idx === sceneIndex ? 'dot-active' : ''}`}
              onClick={() => setSceneIndex(idx)}
            />
          ))}
        </div>
      </div>

      {/* ── FLOATING RIGHT SIDE GLASS LOGIN PANEL ──────────────────────── */}
      <div className="lab-fullscreen-right-card">
        {/* Topbar Tools */}
        <div className="login-topbar">
          <div className="login-clock">
            <span>
              {now.toLocaleDateString(preferences.language === 'am' ? 'am-ET' : 'en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <b>
              {now.toLocaleTimeString(preferences.language === 'am' ? 'am-ET' : 'en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: preferences.timeFormat === '12',
              })}
            </b>
          </div>
          <button
            type="button"
            className="login-control"
            onClick={() => updatePreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' })}
            aria-label={text.theme}
          >
            {preferences.theme === 'light' ? '🌙' : '☀️'}{' '}
            <span>{preferences.theme === 'light' ? t('dark') : t('light')}</span>
          </button>
          <button
            type="button"
            className="login-control"
            onClick={() => updatePreferences({ language: preferences.language === 'en' ? 'am' : 'en' })}
            aria-label={text.language}
          >
            {preferences.language === 'en' ? '🇪🇹' : '🇬🇧'}{' '}
            <span>{preferences.language === 'en' ? 'አማርኛ' : 'English'}</span>
          </button>
        </div>

        <main className="login-card lab-glass-card">
          <header className="login-brand">
            {/* Prominent Laboratory Logo matching final printable report visual size */}
            <div className="login-brand__logo-wrapper lab-logo-wrapper-large">
              <img
                src={labLogo}
                alt="ETU Diagnostic Laboratory Logo"
                className="login-brand__logo-img-large"
              />
            </div>
            <span className="login-brand__name">ETU Diagnostic Laboratory</span>
            <h1 className="login-brand__title">{text.welcome}</h1>
            <p className="login-brand__subtitle">{text.subtitle}</p>
          </header>

          {/* Login Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Server Error Alert */}
            {apiError && (
              <div className="login-error" role="alert">
                <svg
                  className="login-error__icon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>{apiError}</span>
              </div>
            )}

            {/* Username Field */}
            <div className="login-field">
              <label htmlFor="username-input" className="login-field__label">
                {text.username}
              </label>
              <div className="login-field__input-wrapper">
                <svg
                  className="login-field__icon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <input
                  id="username-input"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  disabled={isSubmitting}
                  className={`login-field__input ${
                    errors.username && touched.username ? 'login-field__input--error' : ''
                  }`}
                  placeholder={text.usernameHint}
                  value={values.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
              </div>
              {errors.username && touched.username && (
                <span className="login-field__error-text">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {errors.username}
                </span>
              )}
            </div>

            {/* Password Field */}
            <div className="login-field">
              <label htmlFor="password-input" className="login-field__label">
                {text.password}
              </label>
              <div className="login-field__input-wrapper">
                <svg
                  className="login-field__icon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <input
                  id="password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                  className={`login-field__input login-field__input--password ${
                    errors.password && touched.password ? 'login-field__input--error' : ''
                  }`}
                  placeholder={text.passwordHint}
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="login-field__toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? text.hide : text.show}
                >
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && touched.password && (
                <span className="login-field__error-text">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {errors.password}
                </span>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="login-remember">
              <input
                id="remember-me-checkbox"
                name="rememberMe"
                type="checkbox"
                disabled={isSubmitting}
                className="login-remember__checkbox"
                checked={values.rememberMe}
                onChange={handleChange}
              />
              <label htmlFor="remember-me-checkbox" className="login-remember__label">
                {text.remember}
              </label>
            </div>

            {/* Dynamic Animated Submit Button */}
            <button type="submit" disabled={isSubmitting} className="login-submit lab-dynamic-btn">
              <span className="login-submit__content">
                {isSubmitting ? (
                  <>
                    <span className="login-submit__spinner" aria-hidden="true" />
                    <span>{text.verifying}</span>
                  </>
                ) : (
                  <span>{text.signIn}</span>
                )}
              </span>
            </button>
          </form>
        </main>

        {/* Footer */}
        <footer className="login-footer">
          <p className="login-footer__org">ETU Diagnostic Laboratory</p>
          <p className="login-footer__system">Laboratory Information Management System (LIMS)</p>
          <div className="login-footer__meta">
            <span>
              {text.version} {import.meta.env.VITE_APP_VERSION || '1.0.0'}
            </span>
            <span className="login-footer__divider" />
            <span>
              &copy; {new Date().getFullYear()} {text.rights}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

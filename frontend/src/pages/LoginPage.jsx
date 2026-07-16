/**
 * ETU Diagnostic Laboratory — Enterprise Login Page
 *
 * Implements modern glassmorphism aesthetic, Material Design 3 inputs,
 * client-side form validation, submit states, and full responsive support.
 */

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { login as apiLogin } from '../services/authService.js';
import { useForm } from '../hooks/useForm.js';
import Logo from '../assets/Logo.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import { api } from '../api/client.js';

const copy = { en:{welcome:'Welcome Back',subtitle:'Sign in to Laboratory Information Management System (LIMS)',username:'Username',password:'Password',usernameHint:'Enter your username',passwordHint:'Enter your password',show:'Show password',hide:'Hide password',remember:'Remember my login on this device',signIn:'Sign In Securely',verifying:'Verifying credentials…',requiredUser:'Username is required',shortUser:'Username must be at least 3 characters',requiredPassword:'Password is required',invalid:'Invalid username or password.',version:'Version',rights:'All Rights Reserved',theme:'Theme',language:'Language'},am:{welcome:'እንኳን በደህና መጡ',subtitle:'ወደ የላቦራቶሪ መረጃ አስተዳደር ሥርዓት ይግቡ',username:'የተጠቃሚ ስም',password:'የይለፍ ቃል',usernameHint:'የተጠቃሚ ስምዎን ያስገቡ',passwordHint:'የይለፍ ቃልዎን ያስገቡ',show:'የይለፍ ቃል አሳይ',hide:'የይለፍ ቃል ደብቅ',remember:'በዚህ መሣሪያ ላይ አስታውሰኝ',signIn:'በደህንነት ግባ',verifying:'በማረጋገጥ ላይ…',requiredUser:'የተጠቃሚ ስም ያስፈልጋል',shortUser:'የተጠቃሚ ስም ቢያንስ 3 ፊደላት መሆን አለበት',requiredPassword:'የይለፍ ቃል ያስፈልጋል',invalid:'የተጠቃሚ ስም ወይም የይለፍ ቃል ልክ አይደለም።',version:'ስሪት',rights:'መብቱ በሙሉ የተጠበቀ ነው',theme:'ገጽታ',language:'ቋንቋ'} };

export default function LoginPage() {
  const { user, login } = useAuth();
  const { preferences, updatePreferences, t } = usePreferences();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [now, setNow] = useState(new Date());
  const text = copy[preferences.language];
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);

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
      try { const stored = await api('/preferences', { token: sessionData.token, method: 'PATCH', body: JSON.stringify({ theme: preferences.theme, language: preferences.language }) }); sessionData.user.preferences = { ...sessionData.user.preferences, ...stored.preferences }; } catch { /* Login remains available if preference sync is temporarily unavailable. */ }
      login(sessionData, values.rememberMe);
    } catch (err) {
      setApiError(err.message || text.invalid);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      {/* Premium Animated Background */}
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg__grid" />
        <div className="login-bg__pattern" />
        <div className="login-bg__orb login-bg__orb--1" />
        <div className="login-bg__orb login-bg__orb--2" />
        <div className="login-bg__orb login-bg__orb--3" />
        <div className="login-bg__molecule login-bg__molecule--1" />
        <div className="login-bg__molecule login-bg__molecule--2" />
        <div className="login-bg__molecule login-bg__molecule--3" />
        <div className="login-bg__molecule login-bg__molecule--4" />
        <div className="login-bg__molecule login-bg__molecule--5" />
        <div className="login-bg__molecule login-bg__molecule--6" />
      </div>

      <div className="login-topbar">
        <div className="login-clock"><span>{now.toLocaleDateString(preferences.language==='am'?'am-ET':'en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span><b>{now.toLocaleTimeString(preferences.language==='am'?'am-ET':'en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:preferences.timeFormat==='12'})}</b></div>
        <button type="button" className="login-control" onClick={()=>updatePreferences({theme:preferences.theme==='light'?'dark':'light'})} aria-label={text.theme}>{preferences.theme==='light'?'🌙':'☀️'} <span>{preferences.theme==='light'?t('dark'):t('light')}</span></button>
        <button type="button" className="login-control" onClick={()=>updatePreferences({language:preferences.language==='en'?'am':'en'})} aria-label={text.language}>{preferences.language==='en'?'🇪🇹':'🇬🇧'} <span>{preferences.language==='en'?'አማርኛ':'English'}</span></button>
      </div>

      <div className="login-container">
        {/* Glassmorphic Login Card */}
        <main className="login-card">
          <header className="login-brand">
            <div className="login-brand__logo-wrapper">
              <Logo size={36} />
            </div>
            <span className="login-brand__name">ETU Diagnostic Laboratory</span>
            <h1 className="login-brand__title">{text.welcome}</h1>
            <p className="login-brand__subtitle">
              {text.subtitle}
            </p>
          </header>

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Server Error Message */}
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

            {/* Username field */}
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

            {/* Password field */}
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

            {/* Remember Me */}
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

            {/* Submit Button */}
            <button type="submit" disabled={isSubmitting} className="login-submit">
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
            <span>{text.version} {import.meta.env.VITE_APP_VERSION || '1.0.0'}</span>
            <span className="login-footer__divider" />
            <span>&copy; {new Date().getFullYear()} {text.rights}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

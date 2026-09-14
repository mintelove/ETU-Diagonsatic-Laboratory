import { useState, useEffect, useRef, useCallback } from 'react';
import { ETU_SLIDES } from '../assets/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePreferences } from '../context/PreferencesContext.jsx';
import NotificationBell from './NotificationBell.jsx';

/**
 * Controlled sequence of attractive clinical/medical gradients
 * that transition smoothly when the slide changes.
 */
const TITLE_BACKGROUND_GRADIENTS = [
  'linear-gradient(135deg, rgba(14, 116, 144, 0.92) 0%, rgba(2, 132, 199, 0.92) 100%)',   // Ocean Cyan / Sky Blue
  'linear-gradient(135deg, rgba(67, 56, 202, 0.92) 0%, rgba(99, 102, 241, 0.92) 100%)',   // Blue / Indigo
  'linear-gradient(135deg, rgba(13, 148, 136, 0.92) 0%, rgba(16, 185, 129, 0.92) 100%)',   // Teal / Cyan
  'linear-gradient(135deg, rgba(88, 28, 135, 0.92) 0%, rgba(147, 51, 234, 0.92) 100%)',   // Purple / Violet
  'linear-gradient(135deg, rgba(30, 58, 138, 0.92) 0%, rgba(37, 99, 235, 0.92) 100%)',    // Deep Blue
  'linear-gradient(135deg, rgba(15, 118, 110, 0.92) 0%, rgba(6, 182, 212, 0.92) 100%)',   // Medical Emerald / Cyan
  'linear-gradient(135deg, rgba(76, 29, 149, 0.92) 0%, rgba(124, 58, 237, 0.92) 100%)',   // Royal Purple
  'linear-gradient(135deg, rgba(3, 105, 161, 0.92) 0%, rgba(14, 165, 233, 0.92) 100%)'    // Brilliant Sapphire
];

/**
 * Dynamic text color per slide — chosen based on each slide's visual characteristics.
 * Dark images → bright white. Mixed/lighter images → off-white with stronger shadow.
 * The title badge gradient background provides a readable backdrop regardless,
 * so these are subtle enhancements for maximum contrast.
 */
const SLIDE_TEXT_STYLES = [
  { color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' },   // etu.jpg — dark lab photo
  { color: '#f0f9ff', textShadow: '0 2px 10px rgba(0,0,0,0.55)' },  // et1 — medium-dark
  { color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.45)' },   // et2 — dark equipment
  { color: '#f8fafc', textShadow: '0 2px 10px rgba(0,0,0,0.5)' },   // et3 — mixed lighting
  { color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.45)' },   // et4 — dark tones
  { color: '#f0f9ff', textShadow: '0 2px 10px rgba(0,0,0,0.55)' },  // et5 — medium
  { color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' },    // et6 — dark
  { color: '#f8fafc', textShadow: '0 2px 10px rgba(0,0,0,0.5)' },   // et7 — mixed
];

/**
 * Large Modern Professional ETU Hero Slideshow Banner
 *
 * Placed at the absolute top of the dashboard.
 * On mobile, acts as the primary dashboard header with integrated quick actions:
 * - ☰ Mobile Sidebar Navigation
 * - 📅 Live Current Date
 * - 🔔 Real-time Notifications Bell
 * - 🌐 Language Selector (EN / አማ)
 * - 🌙 Dark / Light Theme Toggle (preserving Admin permissions)
 * - 🚪 Sign Out
 *
 * Spans the dashboard with smooth 5-second continuous automatic looping,
 * dynamic color-changing text background for "ETU DIAGNOSTIC LABORATORY",
 * preloading, interactive navigation dots, previous/next controls, and touch swipe.
 */
export default function EtuHeroBanner({ interval = 5000, className = '' }) {
  const { user, logout } = useAuth();
  const { preferences, updatePreferences, canToggleTheme } = usePreferences();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [now, setNow] = useState(new Date());
  const preloadedRef = useRef(new Set());
  const touchStartXRef = useRef(null);

  // Live timer for formatted date
  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const locale = preferences.language === 'am' ? 'am-ET' : 'en-GB';
  const formattedDate = preferences.dateFormat === 'iso'
    ? now.toISOString().slice(0, 10)
    : now.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

  // Preload all slides on mount
  useEffect(() => {
    ETU_SLIDES.forEach((slide) => {
      if (!preloadedRef.current.has(slide.src)) {
        const img = new Image();
        img.src = slide.src;
        preloadedRef.current.add(slide.src);
      }
    });
  }, []);

  // Continuous slide navigation with infinite wraparound (1 -> 2 -> ... -> last -> 1)
  const nextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev + 1) % ETU_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev - 1 + ETU_SLIDES.length) % ETU_SLIDES.length);
  }, []);

  const goToSlide = useCallback((index) => {
    setCurrentSlideIndex(index);
  }, []);

  // Continuous 5-second slideshow timer: always loops forever, restarts cleanly on index change
  useEffect(() => {
    if (ETU_SLIDES.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % ETU_SLIDES.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, currentSlideIndex]);

  // Touch swipe handlers for mobile
  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    if (e.changedTouches && e.changedTouches[0]) {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartXRef.current - touchEndX;
      touchStartXRef.current = null;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          nextSlide(); // Swiped left -> advance to next slide
        } else {
          prevSlide(); // Swiped right -> go to previous slide
        }
      }
    }
  };

  const currentGradient = TITLE_BACKGROUND_GRADIENTS[currentSlideIndex % TITLE_BACKGROUND_GRADIENTS.length];
  const currentTextStyle = SLIDE_TEXT_STYLES[currentSlideIndex % SLIDE_TEXT_STYLES.length];

  return (
    <div
      className={`etu-hero-banner ${className}`.trim()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-roledescription="carousel"
      aria-label="ETU Diagnostic Laboratory Hero Banner"
    >
      {/* ── Integrated Quick Options Header Bar ────────────── */}
      <div className="etu-hero-quick-bar" onClick={(e) => e.stopPropagation()}>
        <div className="etu-hero-quick-left">
          <button
            type="button"
            className="etu-hero-quick-btn etu-hero-menu-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
            title="Navigation Menu"
            aria-label="Navigation Menu"
          >
            ☰
          </button>
          <div className="etu-hero-quick-date" title="Current Date">
            <span className="date-icon">📅</span>
            <span className="date-text">{formattedDate}</span>
          </div>
        </div>

        <div className="etu-hero-quick-right">
          <div className="etu-hero-quick-bell">
            <NotificationBell />
          </div>

          <button
            type="button"
            className="etu-hero-quick-btn"
            onClick={() => updatePreferences({ language: preferences.language === 'en' ? 'am' : 'en' })}
            title={`Switch to ${preferences.language === 'en' ? 'Amharic' : 'English'}`}
            aria-label="Language Selector"
          >
            🌐 <span className="lang-code">{preferences.language === 'en' ? 'EN' : 'አማ'}</span>
          </button>

          {canToggleTheme && (
            <button
              type="button"
              className="etu-hero-quick-btn"
              onClick={() => updatePreferences({ theme: preferences.theme === 'light' ? 'dark' : 'light' })}
              title={`Switch to ${preferences.theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle Theme"
            >
              {preferences.theme === 'light' ? '☀️' : '🌙'}
            </button>
          )}

          <button
            type="button"
            className="etu-hero-quick-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('open-account-settings'))}
            title="Account Settings"
            aria-label="Account Settings"
          >
            ⚙️
          </button>

          <button
            type="button"
            className="etu-hero-quick-btn etu-hero-logout-btn"
            onClick={logout}
            title="Sign Out"
            aria-label="Sign Out"
          >
            🚪
          </button>
        </div>
      </div>

      {/* ── Slides Container ───────────────────────────────── */}
      <div className="etu-hero-slides-wrapper">
        {ETU_SLIDES.map((slide, index) => {
          const isActive = index === currentSlideIndex;
          return (
            <div
              key={slide.id}
              className={`etu-hero-slide ${isActive ? 'active' : ''}`}
              aria-hidden={!isActive}
            >
              {/* Blurred Ambient Background */}
              <div
                className="etu-hero-bg-blur"
                style={{ backgroundImage: `url(${slide.src})` }}
              />
              {/* Crisp Foreground Image (never distorted or stretched) */}
              <img
                src={slide.src}
                alt={slide.alt}
                className="etu-hero-image"
                loading="eager"
              />
            </div>
          );
        })}
      </div>

      {/* ── Sleek Gradient Overlay ─────────────────────────── */}
      <div className="etu-hero-overlay" />

      {/* ── Content Text Overlay ───────────────────────────── */}
      <div className="etu-hero-content">
        <div className="etu-hero-badge">
          <span className="badge-pulse" />
          <span className="badge-text">ETU Diagnostic Laboratory · Clinical Excellence</span>
        </div>

        {/* Dynamic Color-Changing Background Container for ETU Diagnostic Laboratory Text */}
        <div
          className="etu-hero-title-badge"
          style={{ background: currentGradient }}
        >
          <h1
            className="etu-hero-title"
            style={{
              color: currentTextStyle.color,
              textShadow: currentTextStyle.textShadow,
              transition: 'color 0.8s ease, text-shadow 0.8s ease',
            }}
          >ETU DIAGNOSTIC LABORATORY</h1>
        </div>
        <p className="etu-hero-subtitle">
          Advanced Clinical Pathology · Precision Analytics · Patient-Centric Healthcare
        </p>
        <div className="etu-hero-meta">
          <span className="meta-pill">
            📍 {user?.branchName || 'Main'} Branch
          </span>
          <span className="meta-pill status-pill">
            <span className="status-dot" /> System Operational
          </span>
          <span className="meta-pill slide-pill">
            Slide {currentSlideIndex + 1} of {ETU_SLIDES.length}
          </span>
        </div>
      </div>

      {/* ── Navigation Arrows ──────────────────────────────── */}
      <button
        type="button"
        className="etu-hero-arrow prev"
        onClick={(e) => {
          e.stopPropagation();
          prevSlide();
        }}
        aria-label="Previous slide"
        title="Previous slide"
      >
        ‹
      </button>
      <button
        type="button"
        className="etu-hero-arrow next"
        onClick={(e) => {
          e.stopPropagation();
          nextSlide();
        }}
        aria-label="Next slide"
        title="Next slide"
      >
        ›
      </button>

      {/* ── Navigation Dots ────────────────────────────────── */}
      <div className="etu-hero-dots" role="tablist" aria-label="Slides">
        {ETU_SLIDES.map((slide, index) => {
          const isActive = index === currentSlideIndex;
          return (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Slide ${index + 1}`}
              className={`etu-hero-dot ${isActive ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(index);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

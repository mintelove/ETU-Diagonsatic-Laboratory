import { useState, useEffect, useRef, useCallback } from 'react';
import etu from './etu.jpg';
import et1 from './et1.png';
import et2 from './et2.png';
import et3 from './et3.png';
import et4 from './et4.png';
import et5 from './et5.png';
import et6 from './et6.png';
import et7 from './et7.png';

/**
 * ETU Diagnostic Laboratory Image Slides - NEW Image Set
 * 1. etu.jpg
 * 2. et1.png
 * 3. et2.png
 * 4. et3.png
 * 5. et4.png
 * 6. et5.png
 * 7. et6.png
 * 8. et7.png
 * 
 * Each image displays for exactly 5 seconds with a smooth professional crossfade + subtle horizontal transition.
 */
export const ETU_SLIDES = [
  { id: 'slide-1', src: etu, alt: 'ETU Diagnostic Laboratory - Slide 1' },
  { id: 'slide-2', src: et1, alt: 'ETU Diagnostic Laboratory - Slide 2' },
  { id: 'slide-3', src: et2, alt: 'ETU Diagnostic Laboratory - Slide 3' },
  { id: 'slide-4', src: et3, alt: 'ETU Diagnostic Laboratory - Slide 4' },
  { id: 'slide-5', src: et4, alt: 'ETU Diagnostic Laboratory - Slide 5' },
  { id: 'slide-6', src: et5, alt: 'ETU Diagnostic Laboratory - Slide 6' },
  { id: 'slide-7', src: et6, alt: 'ETU Diagnostic Laboratory - Slide 7' },
  { id: 'slide-8', src: et7, alt: 'ETU Diagnostic Laboratory - Slide 8' },
];

export default function Logo({ size, className = '', style = {}, interval = 5000 }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const timerRef = useRef(null);
  const preloadedRef = useRef(new Set());

  // Preload next image ahead of transition
  const preloadImage = useCallback((index) => {
    if (preloadedRef.current.has(index)) return;
    const img = new Image();
    img.src = ETU_SLIDES[index].src;
    preloadedRef.current.add(index);
  }, []);

  // Preload all images on mount for immediate readiness
  useEffect(() => {
    ETU_SLIDES.forEach((_, i) => preloadImage(i));
  }, [preloadImage]);

  useEffect(() => {
    if (!ETU_SLIDES || ETU_SLIDES.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrentSlideIndex((prev) => {
        const next = (prev + 1) % ETU_SLIDES.length;
        const afterNext = (next + 1) % ETU_SLIDES.length;
        preloadImage(afterNext);
        return next;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interval, preloadImage]);

  const isHeaderLogo = className.includes('main-header-logo-img');
  const showDots = isHeaderLogo;
  const finalSize = size !== undefined ? size : (isHeaderLogo ? null : 36);

  // Wide header container (300×75): use 'contain' to show full banner image
  // Square sidebar/mobile containers (48×48, 60×60): use 'cover' to fill with center-crop
  const imgObjectFit = isHeaderLogo ? 'contain' : 'cover';

  const containerStyle = {
    position: 'relative',
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    ...(finalSize ? { width: `${finalSize}px`, height: `${finalSize}px`, maxHeight: `${finalSize}px`, maxWidth: `${finalSize}px`, flexShrink: 0 } : {}),
    ...style,
  };

  return (
    <div
      className={`etu-image-slider app-logo-img ${className}`.trim()}
      style={containerStyle}
      role="region"
      aria-roledescription="carousel"
      aria-label={`ETU Diagnostic Laboratory Image Slider (Slide ${currentSlideIndex + 1} of ${ETU_SLIDES.length})`}
      data-active-slide={currentSlideIndex + 1}
      data-total-slides={ETU_SLIDES.length}
    >
      {ETU_SLIDES.map((slide, index) => {
        const isActive = index === currentSlideIndex;
        return (
          <img
            key={slide.id}
            src={slide.src}
            alt={slide.alt}
            className={`etu-slide-img ${isActive ? 'slide-active' : ''}`}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100%',
              height: '100%',
              objectFit: imgObjectFit,
              objectPosition: 'center',
              transform: isActive
                ? 'translate(-50%, -50%)'
                : 'translate(calc(-50% + 8px), -50%)',
              opacity: isActive ? 1 : 0,
              transition: 'opacity 0.85s ease-in-out, transform 0.85s ease-in-out',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        );
      })}
      {showDots && ETU_SLIDES.length > 1 && (
        <div className="etu-slider-dots" aria-hidden="true">
          {ETU_SLIDES.map((slide, index) => (
            <span
              key={slide.id}
              className={`etu-slider-dot ${index === currentSlideIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

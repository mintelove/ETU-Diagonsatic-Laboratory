import etu from './etu.jpg';
import et1 from './et1.png';
import et2 from './et2.png';
import et3 from './et3.png';
import et4 from './et4.png';
import et5 from './et5.png';
import et6 from './et6.png';
import et7 from './et7.png';

/**
 * ETU Diagnostic Laboratory Image Slides Catalog
 * Consumed by EtuHeroBanner as the single active showcase slideshow.
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

/**
 * Static Brand Logo Component
 * Clean, lightweight, and static — ensures no duplicate timer or invisible slideshow
 * is running. The only active slideshow in the system is EtuHeroBanner.
 */
export default function Logo({ size, className = '', style = {} }) {
  const isHeaderLogo = className.includes('main-header-logo-img');
  const finalSize = size !== undefined ? size : (isHeaderLogo ? null : 44);

  const containerStyle = {
    position: 'relative',
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...(finalSize ? { width: `${finalSize}px`, height: `${finalSize}px`, maxHeight: `${finalSize}px`, maxWidth: `${finalSize}px`, flexShrink: 0 } : {}),
    ...style,
  };

  return (
    <div
      className={`app-logo-img ${className}`.trim()}
      style={containerStyle}
      aria-label="ETU Diagnostic Laboratory Logo"
    >
      <img
        src={etu}
        alt="ETU Diagnostic Laboratory Logo"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'center',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
